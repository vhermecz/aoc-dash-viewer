import lodash from 'lodash';

/**
 * A smarter encodeURIComponent impl
 * see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
 */
function fixedEncodeURIComponent (str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
        return '%' + c.charCodeAt(0).toString(16);
    });
}

/**
 * Query-string encode
 * query: The query-param dictionary
 * Returns the encoded querystring
 */
export function qs_encode(query) {
    return lodash.map(query, (value, key) =>
        fixedEncodeURIComponent(key) + "=" + fixedEncodeURIComponent(value)
    ).join("&")
}
