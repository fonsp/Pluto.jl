declare class ReactElement {}

type ComponentChild = number | string | Array<ReactElement> | ReactElement

type Dispatch<A> = (value: A) => void
type SetStateAction<S> = S | ((prevState: S) => S)

export interface ErrorInfo {
	componentStack?: string;
}

export declare class Component<P = {}, S = {}> {
	constructor(props?: P, context?: any);
    
    componentWillMount?(): void;
	componentDidMount?(): void;
	componentWillUnmount?(): void;
	getChildContext?(): object;
	componentWillReceiveProps?(nextProps: Readonly<P>, nextContext: any): void;
	shouldComponentUpdate?(
		nextProps: Readonly<P>,
		nextState: Readonly<S>,
		nextContext: any
	): boolean;
	componentWillUpdate?(
		nextProps: Readonly<P>,
		nextState: Readonly<S>,
		nextContext: any
	): void;
	getSnapshotBeforeUpdate?(oldProps: Readonly<P>, oldState: Readonly<S>): any;
	componentDidUpdate?(
		previousProps: Readonly<P>,
		previousState: Readonly<S>,
		snapshot: any
	): void;
	componentDidCatch?(error: any, errorInfo: ErrorInfo): void;
    state: S
    setState(state: any, callback?: any): void
    props: P
    base: HTMLElement
    render(): ComponentChild
}

export declare function html(strings: TemplateStringsArray, ...interpolations: Array<any>): ReactElement

export declare function render(vnode: ComponentChild, parent: Element | Document | ShadowRoot | DocumentFragment, replaceNode?: Element | Text): void
export declare function hydrate(vnode: ComponentChild, parent: Element | Document | ShadowRoot | DocumentFragment): void
export declare function cloneElement(vnode: ReactElement, props?: any, ...children: ComponentChild[]): ReactElement
export declare function h(type: string, props: any, ...children: any[]): ReactElement

declare function SetState<T>(value: T): void
declare function SetState<T>(mutator: (value: T) => T): void

export declare function useState<T = any>(initialValue: T): [T, Dispatch<SetStateAction<T>>]

type Ref<T> = { current: T }
export declare function useRef<T = any>(initialValue?: T): Ref<T>

export declare function useMemo<T = any>(calculate: () => T, deps?: Array<any>): T
export declare function useCallback<T = any>(callback: T, deps?: Array<any>): T
export declare function useErrorBoundary(callback?: (error: any) => Promise<void> | void): [any, () => void];

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
