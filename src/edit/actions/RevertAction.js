L.RevertAction = L.EditAction.extend({
  initialize: function(map, overlay, options) {
    var edit = overlay.editing;

    options = options || {};
    options.toolbarIcon = {
      svg: true,
      html: 'restore',
      tooltip: overlay.options.translation.restoreOriginalImageDimensions,
      className: edit.getMode() === 'lock' ? 'disabled' : '',
    };

    L.EditAction.prototype.initialize.call(this, map, overlay, options);
  },

  addHooks: function() {
    this._overlay.revert();
  },
});
