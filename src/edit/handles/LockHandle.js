L.LockHandle = L.EditHandle.extend({
  options: {
    TYPE: 'lock',
    icon: L.icon({
      // eslint-disable-next-line max-len
      iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAklEQVR4AewaftIAAAD8SURBVO3BPU7CYAAA0AdfjIcQlRCQBG7C3gk2uIPG2RC3Dk16Gz0FTO1WZs/gwGCMP/2+xsSl7+n1er1Iz9LtRQjaPeMeO+TinLDCJV78YqjdA04YodKuxhUaPGoRxMmxwRQZSt87Yo4KExGCeAUyLLFB4bMacxywEClIU2KDKXbInTUYo8JCgoFuGoxQO5uiwY1EA91VmDqrcKeDoX8WdNNgjApvmGGLXKIgXY0xGkxQYItrrFFIEKQ5Yo4KEx9yrDFDhlKkIF6NOQ5Y+KpAhiXWKEQI4pxwiwoLPyuxwQw75FoE7fZYocFEuwI7jHCBV39gL92TXq/Xi/AOcmczZmaIMScAAAAASUVORK5CYII=',
      interactive: false,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    }),
  },

  onRemove: function(map) {
    this.unbindTooltip();
    this._handled.unbindTooltip();
    L.EditHandle.prototype.onRemove.call(this, map);
  },

  _bindListeners: function() {
    var icon = this.getElement();
    var img = this._handled.getElement();

    this.on('contextmenu', L.DomEvent.stop, this);
    L.DomEvent.on(icon, 'mousedown', this._tooltipOn, this);
    L.DomEvent.on(icon, 'mouseout mouseup', this._tooltipOff, this);
    L.DomEvent.on(img, 'mousedown', this._tooltipOn, this);
    L.DomEvent.on(img, 'mouseout mouseup', this._tooltipOff, this);
  },

  _unbindListeners: function() {
    var icon = this.getElement();
    var img = this._handled.getElement();

    this.off('contextmenu', L.DomEvent.stop, this);
    L.DomEvent.off(icon, 'mousedown', this._tooltipOn, this);
    L.DomEvent.off(icon, 'mouseout mouseup', this._tooltipOff, this);
    L.DomEvent.off(img, 'mousedown', this._tooltipOn, this);
    L.DomEvent.off(img, 'mouseout mouseup', this._tooltipOff, this);
  },

  /* cannot be dragged */
  _onHandleDrag: function() {
  },

  updateHandle: function() {
    this.setLatLng(this._handled.getCorner(this._corner));
  },

  _tooltipOn: function(e) {
    if (e && e.type === 'mousedown' && !e.shiftKey) {
      var scope = L.DomUtil.hasClass(e.target, 'leaflet-image-layer') ?
          this._handled :
          this;

      if (this._timeout) { clearTimeout(this._timeout); }
      this._timer = setTimeout(L.bind(function() {
        if (!this.getTooltip()) {
          this.bindTooltip('Locked!', {permanent: true});
        }
        this.openTooltip();
      }, scope), 500);
    }
  },

  _tooltipOff: function(e) {
    var scope = this;

    if (e) {
      scope = L.DomUtil.hasClass(e.target, 'leaflet-image-layer') ?
        this._handled :
        this;
    }

    if (this._timer) { clearTimeout(this._timer); }

    this._timeout = setTimeout(L.bind(function() {
      this.closeTooltip();
    }, scope), 400);
  },
});

L.lockHandle = function(overlay, idx, options) {
  return new L.LockHandle(overlay, idx, options);
};
