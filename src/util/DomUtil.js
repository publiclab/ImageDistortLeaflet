L.DomUtil = L.extend(L.DomUtil, {
  initTranslation: function(obj) {
    this.translation = obj;
  },

  getMatrixString: function(m) {
    var is3d = L.Browser.webkit3d || L.Browser.gecko3d || L.Browser.ie3d;

    /*
     * Since matrix3d takes a 4*4 matrix, we add in an empty row and column,
     * which act as the identity on the z-axis.
     * See:
     *     http://franklinta.com/2014/09/08/computing-css-matrix3d-transforms/
     *     https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function#M.C3.B6bius'_homogeneous_coordinates_in_projective_geometry
     */
    var matrix = [
      m[0], m[3], 0, m[6],
      m[1], m[4], 0, m[7],
      0, 0, 1, 0,
      m[2], m[5], 0, m[8],
    ];

    var str = is3d ? 'matrix3d(' + matrix.join(',') + ')' : '';

    if (!is3d) {
      console
          .log('Your browser must support 3D CSS transforms' +
          'in order to use DistortableImageOverlay.');
    }

    return str;
  },

  getRotateString: function(angle, units) {
    var is3d = L.Browser.webkit3d || L.Browser.gecko3d || L.Browser.ie3d;
    var open = 'rotate' + (is3d ? '3d' : '') + '(';
    var rotateString = (is3d ? '0, 0, 1, ' : '') + angle + units;

    return open + rotateString + ')';
  },

  toggleClass: function(el, className) {
    var c = className;
    return this.hasClass(el, c) ?
      this.removeClass(el, c) : this.addClass(el, c);
  },

  confirmDelete: function() {
    return window.confirm(this.translation.confirmImageDelete);
  },

  confirmDeletes: function(n) {
    if (n === 1) {
      this.confirmDelete();
      return;
    }

    var translation = this.translation.confirmImagesDeletes;
    var warningMsg = '';

    if (typeof translation === 'function') {
      warningMsg = translation(n);
    } else {
      warningMsg = n + ' ' + translation;
    }

    return window.confirm(warningMsg);
  },
});
