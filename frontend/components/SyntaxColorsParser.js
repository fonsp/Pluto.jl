const getCSSVar = (css_var_name) => {
    return getComputedStyle(document.documentElement).getPropertyValue(css_var_name);
}

// looking up variables from computed style
export const literal = getCSSVar("--cm-builtin-color"); //builtin
export const macroName = getCSSVar("--cm-var-color"); //var
export const std_variableName = getCSSVar("--cm-builtin-color"); //builtin
export const bool = getCSSVar("--cm-builtin-color"); //builtin
export const comment = getCSSVar("--cm-comment-color"); //comment
export const atom = getCSSVar("--cm-atom-color"); //atom
export const number = getCSSVar("--cm-number-color"); //number
export const keyword = getCSSVar("--cm-keyword-color"); //keyword
export const string = getCSSVar("--cm-string-color"); //string
export const variableName = getCSSVar("--cm-var-color"); // var
export const def_variableName = getCSSVar("--cm-def-color"); // def-color
export const bracket = getCSSVar("--cm-bracket-color"); //bracket
export const brace = getCSSVar("--cm-bracket-color"); //bracket
export const tagName = getCSSVar("--cm-tag-color"); //tag
export const link = getCSSVar("--cm-link-color"); //link
export const invalid = getCSSVar("--cm-error-color"); //error
export const invalid_bg = getCSSVar("--cm-error-bg-color"); //error-bg-color