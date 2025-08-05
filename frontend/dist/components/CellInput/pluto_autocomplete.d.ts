export function pluto_autocomplete({ request_autocomplete, request_special_symbols, request_packages, on_update_doc_query, request_unsubmitted_global_definitions, cell_id, }: {
    request_autocomplete: PlutoRequestAutocomplete;
    request_special_symbols: () => Promise<SpecialSymbols | null>;
    request_packages: () => Promise<string[]>;
    on_update_doc_query: (query: string) => void;
    request_unsubmitted_global_definitions: () => {
        [uuid: string]: string[];
    };
    cell_id: string;
}): ({
    extension: /*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | /*elided*/ any)[])[])[])[])[])[])[])[])[])[])[];
} | readonly ({
    extension: /*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | /*elided*/ any)[])[])[])[])[])[])[])[])[])[];
} | readonly ({
    extension: /*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | /*elided*/ any)[])[])[])[])[])[])[])[])[];
} | readonly ({
    extension: /*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | /*elided*/ any)[])[])[])[])[])[])[])[];
} | readonly ({
    extension: /*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | /*elided*/ any)[])[])[])[])[])[])[];
} | readonly ({
    extension: /*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | /*elided*/ any)[])[])[])[])[])[];
} | readonly ({
    extension: /*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | /*elided*/ any)[])[])[])[])[];
} | readonly ({
    extension: /*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | /*elided*/ any)[])[])[])[];
} | readonly ({
    extension: /*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | /*elided*/ any)[])[])[];
} | readonly ({
    extension: /*elided*/ any | readonly (/*elided*/ any | readonly (/*elided*/ any | /*elided*/ any)[])[];
} | readonly ({
    extension: /*elided*/ any | readonly (/*elided*/ any | /*elided*/ any)[];
} | readonly ({
    extension: /*elided*/ any | /*elided*/ any;
} | /*elided*/ any)[])[])[])[])[])[])[])[])[])[])[])[];
export type PlutoAutocompleteResult = [text: string, value_type: string, is_exported: boolean, is_from_notebook: boolean, completion_type: string, special_symbol: string | null];
export type PlutoAutocompleteResults = {
    start: number;
    stop: number;
    results: Array<PlutoAutocompleteResult>;
    too_long: boolean;
};
export type PlutoRequestAutocomplete = (options: {
    query: string;
    query_full?: string;
}) => Promise<PlutoAutocompleteResults | null>;
export type SpecialSymbols = {
    emoji: Record<string, string>;
    latex: Record<string, string>;
};
