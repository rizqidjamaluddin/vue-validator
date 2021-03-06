import util, { empty, each, trigger } from '../util'


/**
 * BaseValidation class
 */

export default class BaseValidation {

  constructor (field, vm, el, validator) {
    this.field = field
    this.touched = false
    this.dirty = false
    this.modified = false

    this._validator = validator
    this._vm = vm
    this._el = el
    this._init = this._getValue(el)
    this._value = el.value
    this._validators = {}
  }

  _getValue (el) {
    return el.value
  }

  setValidation (name, arg, msg) {
    let validator = this._validators[name]
    if (!validator) {
      validator = this._validators[name] = {}
      validator.name = name
    }
    
    validator.arg = arg
    if (msg) {
      validator.msg = msg
    }
  }

  listener (e) {
    if (e.relatedTarget && 
      (e.relatedTarget.tagName === 'A' || e.relatedTarget.tagName === 'BUTTON')) {
      return
    }

    if (e.type === 'blur') {
      this.touched = true
    }

    if (!this.dirty && this._checkModified(e.target)) {
      this.dirty = true
    }

    this.modified = this._checkModified(e.target)

    this._validator.validate()
  }

  _checkModified (target) {
    return this._init !== this._getValue(target)
  }

  validate () {
    const _ = util.Vue.util

    let results = {}
    let messages = {}
    let valid = true

    each(this._validators, (descriptor, name) => {
      let asset = this._resolveValidator(name)
      let validator = null
      let msg = null

      if (_.isPlainObject(asset)) {
        if (asset.check && typeof asset.check === 'function') {
          validator = asset.check
        }
        if (asset.message) {
          msg = asset.message
        }
      } else if (typeof asset === 'function') {
        validator = asset
      }

      if (descriptor.msg) {
        msg = descriptor.msg
      }

      if (validator) {
        let ret = validator.call(this._vm, this._getValue(this._el), descriptor.arg)
        if (!ret) {
          valid = false
          if (msg) {
            messages[name] = typeof msg === 'function' 
              ? msg.call(this._vm, this.field, descriptor.arg) 
              : msg
          }
        }
        results[name] = !ret
      }
    }, this)

    this._fireEvent(this._el, valid)

    let props = {
      valid: valid,
      invalid: !valid,
      touched: this.touched,
      untouched: !this.touched,
      dirty: this.dirty,
      pristine: !this.dirty,
      modified: this.modified
    }
    if (!empty(messages)) {
      props.messages = messages
    }
    _.extend(results, props)

    return results
  }

  _fireEvent (el, valid) {
    trigger(el, valid ? 'valid' : 'invalid')
  }

  _resolveValidator (name) {
    const resolveAsset = util.Vue.util.resolveAsset
    return resolveAsset(this._vm.$options, 'validators', name)
  }
}
