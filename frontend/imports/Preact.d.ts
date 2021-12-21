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

export declare function render(vnode: ValidRenderResult, parent: Element | Document | ShadowRoot | DocumentFragment, replaceNode?: Element | Text): void
export declare function hydrate(vnode: ValidRenderResult, parent: Element | Document | ShadowRoot | DocumentFragment): void
export declare function cloneElement(vnode: ReactElement, props?: any, ...children: ValidRenderResult[]): ReactElement
export declare function h(type: string, props: any, ...children: any[]): ReactElement

declare function SetState<T>(value: T): void
declare function SetState<T>(mutator: (value: T) => T): void

export declare function useState<T = any>(initialValue: T): [T, Dispatch<SetStateAction<T>>]

type Ref<T> = { current: T }
export declare function useRef<T = any>(initialValue?: T): Ref<T>

export declare function useMemo<T = any>(calculate: () => T, deps?: Array<any>): T
export declare function useCallback<T = any>(callback: T, deps?: Array<any>): T

type UnsubscribeFn = () => void
type EffectFn = () => void | UnsubscribeFn

export declare function useEffect(fn: EffectFn, deps?: Array<any>): void
export declare function useLayoutEffect(fn: EffectFn, deps?: Array<any>): void

declare class ReactContextProvider<T> {}
declare class ReactContext<T> {
    Provider: ReactContextProvider<T>
    Consumer: any // You're on your own with this one
}
export declare function createContext<T>(initialValue: T | void): ReactContext<T>
export declare function createRef<T = any>(): Ref<T>
export declare function useContext<T>(context: ReactContext<T>): T
