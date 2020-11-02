declare class ReactElement {}

type ValidRenderResult = number | string | Array<ReactElement> | ReactElement

type Dispatch<A> = (value: A) => void
type SetStateAction<S> = S | ((prevState: S) => S)

export declare class Component<State = {}> {
    state: State
    setState(state: any, callback?: any): void
    props: any
    base: HTMLElement
    render(): ValidRenderResult
}

export declare function html(strings: TemplateStringsArray, ...interpolations: Array<any>): ReactElement

export declare function render(jsx: ValidRenderResult, element: HTMLElement)

declare function SetState<T>(value: T): void
declare function SetState<T>(mutator: (value: T) => T): void

export declare function useState<T = any>(initialValue: T): [T, Dispatch<SetStateAction<T>>]

type Ref<T> = { current: T }
export declare function useRef<T = any>(initialValue?: T): Ref<T>

export declare function useMemo<T = any>(calculate: () => T, deps?: Array<any>): T

type UnsubscribeFn = () => void
type EffectFn = () => void | UnsubscribeFn

export declare function useEffect(fn: EffectFn, deps?: Array<any>): void
export declare function useLayoutEffect(fn: EffectFn, deps?: Array<any>): void
