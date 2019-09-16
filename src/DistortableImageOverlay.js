L.DistortableImageOverlay = L.ImageOverlay.extend({

  options: {
    alt: '',
    height: 200,
    crossOrigin: true,
    // todo: find ideal number to prevent distortions during RotateScale, and make it dynamic (remove hardcoding)
    edgeMinWidth: 50,
    editable: true,
    mode: 'distort',
    selected: false,
  },

  initialize: function(url, options) {
    L.setOptions(this, options);

    this.edgeMinWidth = this.options.edgeMinWidth;
    this.editable = this.options.editable;
    this._selected = this.options.selected;
    this._url = url;
    this.rotation = 0;
    // window.rotation = this.rotation;
  },

  onAdd: function(map) {
    this._map = map;
    if (!this._image) { this._initImage(); }
    if (!this._events) { this._initEvents(); }

    this.getPane().appendChild(this._image);

    map.on('viewreset', this._reset, this);

    if (this.options.corners) {
      this._corners = this.options.corners;
      if (map.options.zoomAnimation && L.Browser.any3d) {
        map.on('zoomanim', this._animateZoom, this);
      }

      /* This reset happens before image load; it allows us to place the
       * image on the map earlier with "guessed" dimensions.
       */
      this._reset();
    }

    // Have to wait for the image to load because need to access its w/h
    L.DomEvent.on(this._image, 'load', function() {
      this._initImageDimensions();
      this._reset();
      /* Initialize default corners if not already set */
      if (!this._corners) {
        if (map.options.zoomAnimation && L.Browser.any3d) {
          map.on('zoomanim', this._animateZoom, this);
        }
      }
      /** if there is a featureGroup, only its editable option matters */
      var eventParents = this._eventParents;
      if (eventParents) {
        this.eP = eventParents[Object.keys(eventParents)[0]];
        if (this.eP.editable) { this.editing.enable(); }
      } else {
        if (this.editable) { this.editing.enable(); }
      }
    }, this);

    this.fire('add');

    L.DomEvent.on(this._image, 'click', this.pick, this);
    L.DomEvent.on(map, {
      singleclickon: this._singleClickListeners,
      singleclickoff: this._resetClickListeners,
      singleclick: this._singleClick,
    }, this);
    /**
     * custom events fired from DoubleClickLabels.js. Used to differentiate
     * single / dblclick to not deselect images on map dblclick.
     */
    if (!(map.doubleClickZoom.enabled() || map.doubleClickLabels.enabled())) {
      L.DomEvent.on(map, 'click', this.unpick, this);
    }
  },

  onRemove: function(map) {
    L.DomEvent.off(this._image, 'click', this.pick, this);
    L.DomEvent.off(map, {
      singleclickon: this._singleClickListeners,
      singleclickoff: this._resetClickListeners,
      singleclick: this._singleClick,
    }, this);
    L.DomEvent.off(map, 'click', this.unpick, this);

    if (this.editing) { this.editing.disable(); }
    this.fire('remove');

    L.ImageOverlay.prototype.onRemove.call(this, map);
  },

  _initImage: function() {
    L.ImageOverlay.prototype._initImage.call(this);

    L.extend(this._image, {
      alt: this.options.alt,
    });
  },

  _initImageDimensions: function() {
    var map = this._map;
    var originalImageWidth = L.DomUtil.getStyle(this._image, 'width');
    var originalImageHeight = L.DomUtil.getStyle(this._image, 'height');
    var aspectRatio =
        parseInt(originalImageWidth) / parseInt(originalImageHeight);
    var imageHeight = this.options.height;
    var imageWidth = parseInt(aspectRatio * imageHeight);
    var center = map.latLngToContainerPoint(map.getCenter());
    var offset = L.point(imageWidth, imageHeight).divideBy(2);

    if (this.options.corners) {
      this._corners = this.options.corners;
    } else {
      this._corners = [
        map.containerPointToLatLng(center.subtract(offset)),
        map.containerPointToLatLng(
            center.add(L.point(offset.x, -offset.y))
        ),
        map.containerPointToLatLng(
            center.add(L.point(-offset.x, offset.y))
        ),
        map.containerPointToLatLng(center.add(offset)),
      ];
    }

    this.setBounds(L.latLngBounds(this._corners));

    this._initialDimensions = {
      'height': imageHeight,
      'width': imageWidth,
      'offset': offset,
    };
  },

  _initEvents: function() {
    this._events = ['click'];

    for (var i = 0, l = this._events.length; i < l; i++) {
      L.DomEvent.on(this._image, this._events[i], this._fireMouseEvent, this);
    }
  },

  /* See src/layer/vector/Path.SVG.js in the Leaflet source. */
  _fireMouseEvent: function(event) {
    if (!this.hasEventListeners(event.type)) {
      return;
    }

    var map = this._map;
    var containerPoint = map.mouseEventToContainerPoint(event);
    var layerPoint = map.containerPointToLayerPoint(containerPoint);
    var latlng = map.layerPointToLatLng(layerPoint);

    this.fire(event.type, {
      latlng: latlng,
      layerPoint: layerPoint,
      containerPoint: containerPoint,
      originalEvent: event,
    });
  },

  _singleClick: function(e) {
    if (e.type === 'singleclick') { this.unpick(); }
    else { return; }
  },

  _singleClickListeners: function() {
    var map = this._map;
    L.DomEvent.off(map, 'click', this.unpick, this);
  },

  _resetClickListeners: function() {
    var map = this._map;
    L.DomEvent.on(map, 'click', this.unpick, this);
  },

  isPicked: function() {
    return this._selected;
  },

  unpick: function() {
    var edit = this.editing;
    if (!edit.enabled()) { return false; }

    edit._removeToolbar();
    if (edit._mode !== 'lock') {
      edit._hideMarkers();
    }

    this._selected = false;
    return this;
  },

  pick: function(e) {
    var edit = this.editing;

    if (!edit.enabled()) { return false; }

    this._selected = true;
    edit._addToolbar();
    edit._showMarkers();

    if (e) {
      if (L.DomUtil.hasClass(e.target, 'selected')) { this.unpick(); }
      L.DomEvent.stopPropagation(e);
    }
    return this;
  },

  setCorner: function(corner, latlng) {
    var edit = this.editing;

    this._corners[corner] = latlng;

    this.setBounds(L.latLngBounds(this.getCorners()));
    this.fire('update');

    if (edit.toolbar && edit.toolbar instanceof L.DistortableImage.PopupBar) {
      edit._updateToolbarPos();
    }

    return this;
  },

  setCorners: function(latlngObj) {
    var edit = this.editing;
    var map = this._map;
    var zoom = map.getZoom();
    var i = 0;
    // this is to fix https://github.com/publiclab/Leaflet.DistortableImage/issues/402
    for (var k in latlngObj) {
      if ((zoom === 0 && (map.project(latlngObj[k]).y < 2 || map.project(latlngObj[k]).y >= 255)) ||
          (zoom !== 0 && (map.project(latlngObj[k]).y / zoom < 2 || map.project(latlngObj[k]).y / Math.pow(2, zoom) >= 255))
      ) {
        // calling reset / update w/ the same corners bc it prevents a marker flicker for rotate
        this.setBounds(L.latLngBounds(this.getCorners()));
        this.fire('update');
        return;
      }
    }

    for (k in latlngObj) {
      this._corners[i] = latlngObj[k];
      i += 1;
    }

    this.setBounds(L.latLngBounds(this.getCorners()));
    this.fire('update');

    if (edit.toolbar && edit.toolbar instanceof L.DistortableImage.PopupBar) {
      edit._updateToolbarPos();
    }

    return this;
  },

  setCornersFromPoints: function(pointsObj) {
    var map = this._map;
    var edit = this.editing;
    var i = 0;

    for (var k in pointsObj) {
      this._corners[i] = map.layerPointToLatLng(pointsObj[k]);
      i += 1;
    }

    this.setBounds(L.latLngBounds(this.getCorners()));
    this.fire('update');

    if (edit.toolbar && edit.toolbar instanceof L.DistortableImage.PopupBar) {
      edit._updateToolbarPos();
    }

    return this;
  },

  scaleBy: function(scale) {
    var map = this._map;
    var center = map.project(this.getCenter());
    var i;
    var p;
    var scaledCorners = {0: '', 1: '', 2: '', 3: ''};

    if (scale === 0) { return; }

    for (i = 0; i < 4; i++) {
      p = map
          .project(this.getCorner(i))
          .subtract(center)
          .multiplyBy(scale)
          .add(center);
      scaledCorners[i] = map.unproject(p);
    }

    this.setCorners(scaledCorners);

    return this;
  },

  rotateBy: function(angle) {
    var map = this._map;
    var center = map.project(this.getCenter());
    var corners = {0: '', 1: '', 2: '', 3: ''};
    var i;
    var p;
    var q;

    for (i = 0; i < 4; i++) {
      p = map.project(this.getCorner(i)).subtract(center);
      q = L.point(
          Math.cos(angle) * p.x - Math.sin(angle) * p.y,
          Math.sin(angle) * p.x + Math.cos(angle) * p.y
      );
      corners[i] = map.unproject(q.add(center));
    }

    this.setCorners(corners);

    // window.angle = L.TrigUtil.radiansToDegrees(angle);

    this.rotation -= L.TrigUtil.radiansToDegrees(angle);

    return this;
  },

  _revert: function() {
    var a = this.rotation;
    var map = this._map;
    var edit = this.editing;
    var center = map.project(this.getCenter());
    var offset = this._initialDimensions.offset;
    var corners = {
      0: map.unproject(center.subtract(offset)),
      1: map.unproject(center.add(L.point(offset.x, -offset.y))),
      2: map.unproject(center.add(L.point(-offset.x, offset.y))),
      3: map.unproject(center.add(offset)),
    };

    map.removeLayer(edit._handles[edit._mode]);

    this.setCorners(corners);

    if (a !== 0) { this.rotateBy(L.TrigUtil.degreesToRadians(360 - a)); }

    map.addLayer(edit._handles[edit._mode]);

    this.rotation = a;
  },

  /* Copied from Leaflet v0.7 https://github.com/Leaflet/Leaflet/blob/66282f14bcb180ec87d9818d9f3c9f75afd01b30/src/dom/DomUtil.js#L189-L199 */
  /* since L.DomUtil.getTranslateString() is deprecated in Leaflet v1.0 */
  _getTranslateString: function(point) {
    // on WebKit browsers (Chrome/Safari/iOS Safari/Android)
    // using translate3d instead of translate
    // makes animation smoother as it ensures HW accel is used.
    // Firefox 13 doesn't care
    // (same speed either way), Opera 12 doesn't support translate3d

    var is3d = L.Browser.webkit3d;
    var open = 'translate' + (is3d ? '3d' : '') + '(';
    var close = (is3d ? ',0' : '') + ')';

    return open + point.x + 'px,' + point.y + 'px' + close;
  },

  _reset: function() {
    var map = this._map;
    var image = this._image;
    var latLngToLayerPoint = L.bind(map.latLngToLayerPoint, map);
    var transformMatrix = this
        ._calculateProjectiveTransform(latLngToLayerPoint);
    var topLeft = latLngToLayerPoint(this.getCorner(0));
    var warp = L.DomUtil.getMatrixString(transformMatrix);
    var translation = this._getTranslateString(topLeft);

    /* See L.DomUtil.setPosition. Mainly for the purposes of L.Draggable. */
    image._leaflet_pos = topLeft;

    image.style[L.DomUtil.TRANSFORM] = [translation, warp].join(' ');

    /* Set origin to the upper-left corner rather than
     * the center of the image, which is the default.
     */
    image.style[L.DomUtil.TRANSFORM + '-origin'] = '0 0 0';
  },

  /*
   * Calculates the transform string that will be
   * correct *at the end* of zooming.
   * Leaflet then generates a CSS3 animation between the current transform and
   * future transform which makes the transition appear smooth.
   */
  _animateZoom: function(event) {
    var map = this._map;
    var image = this._image;
    var latLngToNewLayerPoint = function(latlng) {
      return map._latLngToNewLayerPoint(latlng, event.zoom, event.center);
    };
    var transformMatrix = this._calculateProjectiveTransform(
        latLngToNewLayerPoint
    );
    var topLeft = latLngToNewLayerPoint(this.getCorner(0));
    var warp = L.DomUtil.getMatrixString(transformMatrix);
    var translation = this._getTranslateString(topLeft);

    /* See L.DomUtil.setPosition. Mainly for the purposes of L.Draggable. */
    image._leaflet_pos = topLeft;

    image.style[L.DomUtil.TRANSFORM] = [translation, warp].join(' ');
  },

  getCorners: function() {
    return this._corners;
  },

  getCorner: function(i) {
    return this._corners[i];
  },

  // image (vertex) centroid calculation
  getCenter: function() {
    var map = this._map;
    var reduce = this.getCorners().reduce(function(agg, corner) {
      return agg.add(map.project(corner));
    }, L.point(0, 0));
    return map.unproject(reduce.divideBy(4));
  },

  // Use for translation calculations
  // for translation the delta for 1 corner applies to all 4
  _calcCornerPointDelta: function() {
    return this._dragStartPoints[0].subtract(this._dragPoints[0]);
  },

  _calcCenterTwoCornerPoints: function(topLeft, topRight) {
    var toolPoint = {x: '', y: ''};

    toolPoint.x = topRight.x + (topLeft.x - topRight.x) / 2;
    toolPoint.y = topRight.y + (topLeft.y - topRight.y) / 2;

    return toolPoint;
  },

  _calculateProjectiveTransform: function(latLngToCartesian) {
    /* Setting reasonable but made-up image defaults
     * allow us to place images on the map before
     * they've finished downloading. */
    var offset = latLngToCartesian(this._corners[0]);
    var w = this._image.offsetWidth || 500;
    var h = this._image.offsetHeight || 375;
    var c = [];
    var j;
    /* Convert corners to container points (i.e. cartesian coordinates). */
    for (j = 0; j < this._corners.length; j++) {
      c.push(latLngToCartesian(this._corners[j])._subtract(offset));
    }

    /*
     * This matrix describes the action of
     * the CSS transform on each corner of the image.
     * It maps from the coordinate system centered
     * at the upper left corner of the image
     * to the region bounded by the latlngs in this._corners.
     * For example:
     * 0, 0, c[0].x, c[0].y
     * says that the upper-left corner of the image
     * maps to the first latlng in this._corners.
     */
    return L.MatrixUtil.general2DProjection(
        0, 0, c[0].x, c[0].y,
        w, 0, c[1].x, c[1].y,
        0, h, c[2].x, c[2].y,
        w, h, c[3].x, c[3].y
    );
  },
});

L.distortableImageOverlay = function(id, options) {
  return new L.DistortableImageOverlay(id, options);
};

L.Map.addInitHook(function() {
  if (!L.DomUtil.hasClass(this.getContainer(), 'ldi')) {
    L.DomUtil.addClass(this.getContainer(), 'ldi');
  }
});
