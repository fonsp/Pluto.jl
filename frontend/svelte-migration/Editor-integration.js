import { Editor } from './Editor-complete.svelte'

// 创建自定义元素包装器，使 Svelte 组件可以在 Preact 环境中使用
export class EditorSvelteElement extends HTMLElement {
  constructor() {
    super()
    this.component = null
    this.props = {}
    this.observer = null
  }

  static get observedAttributes() {
    return ['launch_params', 'initial_notebook_state', 'preamble_element', 'pluto_editor_element']
  }

  connectedCallback() {
    this.render()
    this.setupAttributeObserver()
  }

  disconnectedCallback() {
    if (this.component) {
      this.component.$destroy()
      this.component = null
    }
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.updateProps()
      this.render()
    }
  }

  setupAttributeObserver() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          this.updateProps()
          this.render()
        }
      })
    })
    this.observer.observe(this, { attributes: true })
  }

  updateProps() {
    try {
      this.props = {
        launch_params: this.getAttribute('launch_params') ? JSON.parse(this.getAttribute('launch_params')) : {},
        initial_notebook_state: this.getAttribute('initial_notebook_state') ? JSON.parse(this.getAttribute('initial_notebook_state')) : {},
        pluto_editor_element: this.getAttribute('pluto_editor_element'),
      }
    } catch (error) {
      console.error('Error parsing attributes:', error)
      this.props = {}
    }
  }

  render() {
    if (this.component) {
      this.component.$set(this.props)
    } else {
      try {
        this.component = new Editor({
          target: this,
          props: this.props
        })
      } catch (error) {
        console.error('Error creating Svelte component:', error)
      }
    }
  }

  // 提供方法来更新 props
  setProps(newProps) {
    this.props = { ...this.props, ...newProps }
    if (this.component) {
      this.component.$set(this.props)
    }
  }

  // 提供方法来获取当前状态
  getState() {
    if (this.component) {
      return this.component.$capture_state()
    }
    return null
  }
}

// 注册自定义元素
customElements.define('pluto-editor-svelte', EditorSvelteElement)

// 创建 Preact 包装器函数
export function createEditorSvelteWrapper(preactComponent) {
  return class SvelteWrapper extends preactComponent {
    constructor(props) {
      super(props)
      this.svelteElement = null
    }

    componentDidMount() {
      super.componentDidMount && super.componentDidMount()
      this.createSvelteElement()
    }

    componentDidUpdate(prevProps) {
      super.componentDidUpdate && super.componentDidUpdate(prevProps)
      if (this.svelteElement) {
        this.svelteElement.setProps(this.props)
      }
    }

    componentWillUnmount() {
      super.componentWillUnmount && super.componentWillUnmount()
      if (this.svelteElement && this.svelteElement.parentNode) {
        this.svelteElement.parentNode.removeChild(this.svelteElement)
      }
    }

    createSvelteElement() {
      this.svelteElement = document.createElement('pluto-editor-svelte')
      
      // 设置属性
      Object.keys(this.props).forEach(key => {
        if (this.props[key] != null) {
          this.svelteElement.setAttribute(key, JSON.stringify(this.props[key]))
        }
      })

      // 添加到 DOM
      if (this.base) {
        this.base.appendChild(this.svelteElement)
      }
    }

    render() {
      return preact.h('div', { ref: (el) => this.base = el })
    }
  }
}

// 直接导出 Svelte 组件供纯 Svelte 项目使用
export { Editor as EditorSvelte }

// 创建兼容 Preact 的包装器
export function createPreactCompatibleEditor(EditorPreactComponent) {
  return class EditorPreactWrapper extends EditorPreactComponent {
    constructor(props) {
      super(props)
      this.svelteComponent = null
    }

    componentDidMount() {
      super.componentDidMount && super.componentDidMount()
      this.initializeSvelteComponent()
    }

    componentDidUpdate(prevProps) {
      super.componentDidUpdate && super.componentDidUpdate(prevProps)
      if (this.svelteComponent) {
        this.svelteComponent.$set(this.props)
      }
    }

    componentWillUnmount() {
      super.componentWillUnmount && super.componentWillUnmount()
      if (this.svelteComponent) {
        this.svelteComponent.$destroy()
      }
    }

    initializeSvelteComponent() {
      if (this.base) {
        this.svelteComponent = new Editor({
          target: this.base,
          props: this.props
        })
      }
    }

    render() {
      const result = super.render()
      return result
    }
  }
}