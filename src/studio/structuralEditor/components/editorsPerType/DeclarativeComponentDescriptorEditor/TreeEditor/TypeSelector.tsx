import {React} from '$studio/handy'
import css from './TypeSelector.css'
import {filter} from 'fuzzaldrin-plus'
import cx from 'classnames'
import * as _ from 'lodash'
import {NODE_TYPE, STATUS} from './constants'
import {fitInput} from './utils'

type Props = {
  isActive: boolean
  initialValue: string
  onClick: Function
  listOfDisplayNames: string[]
}
type State = {
  query: string
  matchedDisplayNames: string[]
  focusedIndex: number
  willListUnmount: boolean
}

class TypeSelector extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props)

    const query = this.props.initialValue || 'div'
    const matchedDisplayNames = filter(props.listOfDisplayNames, query)
    this.state = {
      query,
      matchedDisplayNames,
      focusedIndex: 0,
      willListUnmount: false,
    }
  }

  componentDidMount() {
    fitInput(this.input)
    document.addEventListener('mousedown', this._handleMouseDownOutsideList)
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this._handleMouseDownOutsideList)    
  }

  componentWillReceiveProps(nextProps) {
    if (!this.props.isActive && nextProps.isActive) {
      this.input.focus()
      this.input.select()
    }

    if (this.props.isActive && !nextProps.isActive) {
      this.setState((state) => ({
        willListUnmount: false,
        query: nextProps.initialValue || state.query,
      }))
      this.input.blur()
    }

    if (nextProps.initialValue && (nextProps.initialValue !== this.state.query)) {
      this.setState(() => ({query: nextProps.initialValue}))
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      (!this.props.isActive && prevProps.isActive) ||
      this.state.query !== prevState.query
    ) {
      fitInput(this.input)
    }
  }

  _handleMouseDownOutsideList =  (e: $FixMe) => {
    if (this.listContainer && !this.listContainer.contains(e.target)) {
      this.props.handleClickOutsideList(e, {nodeType: NODE_TYPE.COMPONENT, displayName: 'div'})
    }
  }

  handleKeyDown = e => {
    const maxIndex = this.state.matchedDisplayNames.length - 1
    if (e.keyCode === 38) {
      e.preventDefault()
      this.setState(state => ({
        focusedIndex: _.clamp(state.focusedIndex - 1, 0, maxIndex),
      }))
    }
    if (e.keyCode === 40) {
      e.preventDefault()
      this.setState(state => ({
        focusedIndex: _.clamp(state.focusedIndex + 1, 0, maxIndex),
      }))
    }
    if (e.keyCode === 13) {
      this.selectNameAtIndex(this.state.focusedIndex)
    }
    if (e.keyCode === 9) {
      e.preventDefault()
      const isNameValid = this.selectNameAtIndex(this.state.focusedIndex)
      if (isNameValid) {
        this.props.onTab()
      } else {
        this.input.focus()
      }
    }
    if (e.keyCode === 27) {
      if (this.props.initialValue) {
        this.setState(() => ({query: this.props.initialValue}))
      }
      this._unmount(() => {
        this.input.blur()
        this.props.onCancel()
      })
    }
  }

  onChange = e => {
    fitInput(this.input)
    const {value} = e.target
    if (value.toLowerCase() === 't ' && !this.props.hasChildren) {
      this._unmount(() => {
        this.props.onSelect({nodeType: NODE_TYPE.TEXT})
      })
    } else {
      const {listOfDisplayNames} = this.props
      const matchedDisplayNames =
        value.length > 0
          ? filter(listOfDisplayNames, value)
          : listOfDisplayNames
      this.setState(() => ({
        query: value,
        matchedDisplayNames,
        focusedIndex: 0,
      }))
    }
  }

  selectNameAtIndex(index: number) {
    let isNameValid = false
    const displayName = this.state.matchedDisplayNames[index]
    if (displayName != null) {
      isNameValid = true
      this._unmount(() => {
        this.props.onSelect({nodeType: NODE_TYPE.COMPONENT, displayName})
      })
    }
    return isNameValid
  }

  _unmount(cb) {
    this.setState(() => ({willListUnmount: true}))
    setTimeout(cb, 100)
  }

  render() {
    const {focusedIndex, matchedDisplayNames, query} = this.state
    return (
      <div className={css.container} onClick={this.props.onClick}>
        <input
          type="text"
          ref={c => (this.input = c)}
          className={cx(css.input, {[css.isDisabled]: !this.props.isActive})}
          value={query}
          onChange={this.onChange}
          onKeyDown={this.handleKeyDown}
        />
        {this.props.isActive && (
          <div
            ref={c => this.listContainer = c}
            className={cx(css.list, {
              [css.willUnmount]: this.state.willListUnmount,
            })}
            // style={{'--width': this.props.width}}
          >
            {matchedDisplayNames.map((displayName, index) => {
              return (
                <div
                  key={displayName}
                  className={cx(css.option, {
                    [css.isSelected]: index === focusedIndex,
                  })}
                  onMouseEnter={() =>
                    this.setState(() => ({focusedIndex: index}))
                  }
                  onClick={() => this.selectNameAtIndex(index)}
                >
                  {displayName}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }
}

export default TypeSelector
