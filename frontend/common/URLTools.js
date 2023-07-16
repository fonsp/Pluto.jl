export const with_query_params = (/** @type {String | URL} */ url_str, /** @type {Record<string,string | null | undefined>} */ params) => {
    const fake_base = "http://delete-me.com/"
    const url = new URL(url_str, fake_base)
    Object.entries(params).forEach(([key, val]) => {
        if (val != null) url.searchParams.append(key, val)
    })
    return url.toString().replace(fake_base, "")
}

console.assert(with_query_params("https://example.com/", { a: "b c" }) === "https://example.com/?a=b+c")
console.assert(with_query_params(new URL("https://example.com/"), { a: "b c" }) === "https://example.com/?a=b+c")
console.assert(with_query_params(new URL("https://example.com/"), { a: "b c", asdf: null, xx: "123" }) === "https://example.com/?a=b+c&xx=123")
console.assert(with_query_params("index.html", { a: "b c" }) === "index.html?a=b+c")
console.assert(with_query_params("index.html?x=123", { a: "b c" }) === "index.html?x=123&a=b+c")
console.assert(with_query_params("index.html?x=123#asdf", { a: "b c" }) === "index.html?x=123&a=b+c#asdf")
