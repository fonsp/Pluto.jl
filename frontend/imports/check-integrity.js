export default async function checkScriptIntegrity(file, integrity)
{
    const iframe = document.createElement('iframe');
    iframe.src = 'javascript:void(0)';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    const script = doc.createElement('script');
    script.type = 'module';
    script.integrity = integrity;
    script.crossOrigin = 'anonymous';
    script.src = file;
    const promise = new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
    });

    doc.head.append(script);

    return await promise.then(() => {
        iframe.parentNode.removeChild(iframe);
        return true
    });
}
