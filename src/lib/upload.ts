/**
 * POST a FormData body and report upload progress (0–1).
 * fetch() cannot observe request-body progress, so this uses XHR.
 */
export function postFormWithProgress<T = Record<string, unknown>>(
  url: string,
  body: FormData,
  onProgress: (fraction: number) => void
): Promise<{ ok: boolean; status: number; data: T }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.responseType = "json";

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };

    xhr.onload = () =>
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        data: (xhr.response ?? {}) as T,
      });
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));

    xhr.send(body);
  });
}
