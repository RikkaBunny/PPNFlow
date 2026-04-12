/*
 * wgc_capture.dll — Minimal WGC window-level capture for Python ctypes.
 *
 * Exports:
 *   int  wgc_capture(HWND hwnd, uint8_t** out_buf, int* out_w, int* out_h, int* out_stride)
 *   void wgc_free(uint8_t* buf)
 *
 * Uses Windows.Graphics.Capture to grab a single frame from any window,
 * even if occluded or minimized. Returns BGRA pixel data.
 *
 * Build (MSVC x64):
 *   cl /EHsc /O2 /LD wgc_capture.cpp /Fe:wgc_capture.dll
 *      d3d11.lib dxgi.lib windowsapp.lib ole32.lib
 */

#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <windows.h>
#include <d3d11.h>
#include <dxgi1_2.h>

#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Graphics.Capture.h>
#include <winrt/Windows.Graphics.DirectX.h>
#include <winrt/Windows.Graphics.DirectX.Direct3D11.h>
#include <winrt/Windows.System.h>
#include <windows.graphics.capture.interop.h>
#include <windows.graphics.directx.direct3d11.interop.h>

#include <cstdint>
#include <cstring>
#include <mutex>
#include <condition_variable>
#include <chrono>

using namespace winrt;
using namespace winrt::Windows::Graphics::Capture;
using namespace winrt::Windows::Graphics::DirectX;
using namespace winrt::Windows::Graphics::DirectX::Direct3D11;

// ── Helpers ──

static com_ptr<ID3D11Device> g_d3dDevice;
static com_ptr<ID3D11DeviceContext> g_d3dContext;
static IDirect3DDevice g_winrtDevice{ nullptr };

static void ensure_d3d() {
    if (g_d3dDevice) return;

    D3D_FEATURE_LEVEL featureLevel;
    UINT flags = D3D11_CREATE_DEVICE_BGRA_SUPPORT;
    D3D11CreateDevice(
        nullptr, D3D_DRIVER_TYPE_HARDWARE, nullptr, flags,
        nullptr, 0, D3D11_SDK_VERSION,
        g_d3dDevice.put(), &featureLevel, g_d3dContext.put()
    );

    // Wrap as WinRT IDirect3DDevice
    com_ptr<IDXGIDevice> dxgiDevice;
    g_d3dDevice.as(dxgiDevice);

    com_ptr<::IInspectable> inspectable;
    CreateDirect3D11DeviceFromDXGIDevice(dxgiDevice.get(), inspectable.put());
    g_winrtDevice = inspectable.as<IDirect3DDevice>();
}

static GraphicsCaptureItem create_capture_item(HWND hwnd) {
    auto interop = get_activation_factory<GraphicsCaptureItem, IGraphicsCaptureItemInterop>();
    GraphicsCaptureItem item{ nullptr };
    check_hresult(interop->CreateForWindow(
        hwnd,
        guid_of<ABI::Windows::Graphics::Capture::IGraphicsCaptureItem>(),
        put_abi(item)
    ));
    return item;
}

// ── Exported functions ──

extern "C" {

__declspec(dllexport)
int wgc_capture(HWND hwnd, uint8_t** out_buf, int* out_w, int* out_h, int* out_stride) {
    if (!hwnd || !IsWindow(hwnd)) return -1;
    if (!out_buf || !out_w || !out_h || !out_stride) return -2;

    *out_buf = nullptr;
    *out_w = 0;
    *out_h = 0;
    *out_stride = 0;

    try {
        init_apartment(apartment_type::multi_threaded);
    } catch (...) {
        // Already initialized
    }

    try {
        ensure_d3d();

        // WGC can't capture minimized windows (DWM freezes texture).
        // Return -6 so caller can wait/retry instead of failing.
        if (IsIconic(hwnd)) return -6;  // MINIMIZED

        auto item = create_capture_item(hwnd);
        auto size = item.Size();
        if (size.Width <= 0 || size.Height <= 0) return -3;

        // Create frame pool (free-threaded)
        auto pool = Direct3D11CaptureFramePool::CreateFreeThreaded(
            g_winrtDevice,
            DirectXPixelFormat::B8G8R8A8UIntNormalized,
            1,
            size
        );

        auto session = pool.CreateCaptureSession(item);

        // Frame synchronization — keep trying until we get a non-black frame
        std::mutex mtx;
        std::condition_variable cv;
        int frameCount = 0;
        Direct3D11CaptureFrame latestFrame{ nullptr };

        pool.FrameArrived([&](Direct3D11CaptureFramePool const& sender, auto&&) {
            auto frame = sender.TryGetNextFrame();
            if (frame) {
                std::lock_guard<std::mutex> lock(mtx);
                frameCount++;
                latestFrame = frame;
                cv.notify_one();
            }
        });

        session.StartCapture();

        // Pre-create staging texture
        com_ptr<ID3D11Texture2D> staging;
        D3D11_TEXTURE2D_DESC desc{};
        desc.Width = size.Width;
        desc.Height = size.Height;
        desc.MipLevels = 1;
        desc.ArraySize = 1;
        desc.Format = DXGI_FORMAT_B8G8R8A8_UNORM;
        desc.SampleDesc.Count = 1;
        desc.Usage = D3D11_USAGE_STAGING;
        desc.CPUAccessFlags = D3D11_CPU_ACCESS_READ;
        check_hresult(g_d3dDevice->CreateTexture2D(&desc, nullptr, staging.put()));

        // Try up to 10 frames over 5 seconds, return first non-black frame
        uint8_t* resultBuf = nullptr;
        int resultW = 0, resultH = 0, resultStride = 0;

        for (int attempt = 0; attempt < 10; attempt++) {
            // Wait for next frame
            {
                std::unique_lock<std::mutex> lock(mtx);
                int target = frameCount + 1;
                if (!cv.wait_for(lock, std::chrono::milliseconds(500),
                                 [&] { return frameCount >= target; })) {
                    continue; // timeout, try again
                }
            }

            if (!latestFrame) continue;

            // Read this frame's pixels
            auto frameSize = latestFrame.ContentSize();
            auto surface = latestFrame.Surface();

            auto access = surface.as<::Windows::Graphics::DirectX::Direct3D11::IDirect3DDxgiInterfaceAccess>();
            com_ptr<ID3D11Texture2D> frameTex;
            check_hresult(access->GetInterface(IID_PPV_ARGS(frameTex.put())));

            g_d3dContext->CopyResource(staging.get(), frameTex.get());
            g_d3dContext->Flush();

            D3D11_MAPPED_SUBRESOURCE mapped{};
            check_hresult(g_d3dContext->Map(staging.get(), 0, D3D11_MAP_READ, 0, &mapped));

            int w = frameSize.Width;
            int h = frameSize.Height;

            // Check if frame has non-zero content (sample a few pixels)
            const uint8_t* src = (const uint8_t*)mapped.pData;
            bool hasContent = false;
            // Check 16 sample points across the image
            for (int sy = h / 8; sy < h && !hasContent; sy += h / 4) {
                for (int sx = w / 8; sx < w && !hasContent; sx += w / 4) {
                    const uint8_t* px = src + sy * mapped.RowPitch + sx * 4;
                    if (px[0] > 0 || px[1] > 0 || px[2] > 0) {
                        hasContent = true;
                    }
                }
            }

            if (hasContent) {
                // Copy pixels to output buffer
                int outStride = w * 4;
                resultBuf = (uint8_t*)malloc(outStride * h);
                if (resultBuf) {
                    for (int y = 0; y < h; y++) {
                        memcpy(resultBuf + y * outStride, src + y * mapped.RowPitch, outStride);
                    }
                    resultW = w;
                    resultH = h;
                    resultStride = outStride;
                }
                g_d3dContext->Unmap(staging.get(), 0);
                break;
            }

            g_d3dContext->Unmap(staging.get(), 0);
            // Frame was black, try next one
        }

        session.Close();
        pool.Close();

        if (!resultBuf) return -4;

        *out_buf = resultBuf;
        *out_w = resultW;
        *out_h = resultH;
        *out_stride = resultStride;
        return 0;

    } catch (hresult_error const& e) {
        return (int)e.code();
    } catch (...) {
        return -99;
    }
}

__declspec(dllexport)
void wgc_free(uint8_t* buf) {
    if (buf) free(buf);
}

} // extern "C"
