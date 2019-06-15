L.DistortableCollection = L.FeatureGroup.extend({
  onAdd: function(map) {
    L.FeatureGroup.prototype.onAdd.call(this, map);

    this._map = map;

    L.DomEvent.on(document, "keydown", this._onKeyDown, this);
    L.DomEvent.on(map, "click", this._deselectAll, this);

    /**
     * the box zoom override works, but there is a bug involving click event propogation.
     * keeping uncommented for now so that it isn't used as a multi-select mechanism
     */

    // L.DomEvent.on(map, "boxzoomend", this._addSelections, this);

    var lastSelected;

    this.eachLayer(function(layer) {
      L.DomEvent.on(layer._image, "mousedown", this._deselectOthers, this);
      L.DomEvent.on(layer, "dragstart", this._dragStartMultiple, this);
      L.DomEvent.on(layer, "drag", this._dragMultiple, this);

      if (layer.options.selected) {
        layer.editing._deselect();
        lastSelected = layer.editing;
      }
    }, this);

    if (lastSelected) {
      lastSelected._select();
    }
  },

  onRemove: function() {
    var map = this._map;

    L.DomEvent.off(document, "keydown", this._onKeyDown, this);
    L.DomEvent.off(map, "click", this._deselectAll, this);
    // L.DomEvent.off(map, "boxzoomend", this._addSelections, this);

    this.eachLayer(function(layer) {
      L.DomEvent.off(layer._image, "mousedown", this._deselectOthers, this);
      L.DomEvent.off(layer, "dragstart", this._dragStartMultiple, this);
      L.DomEvent.off(layer, "drag", this._dragMultiple, this);
    }, this);
  },

  isSelected: function(overlay) {
    return L.DomUtil.hasClass(overlay.getElement(), "selected");
  },

  _toggleMultiSelect: function(event, edit) {
    if (edit._mode === "lock") { return; }

    if (event.metaKey || event.ctrlKey) {
      L.DomUtil.toggleClass(event.target, "selected");
    }
  },

  _deselectOthers: function(event) {
    this.eachLayer(function(layer) {
      var edit = layer.editing;
      if (layer.getElement() !== event.target) {
        edit._deselect();
      } else {
        this._toggleMultiSelect(event, edit);
      }
    }, this);

    L.DomEvent.stopPropagation(event);
  },

  _addSelections: function(e) {
    var box = e.boxZoomBounds,
      i = 0;

    this.eachLayer(function(layer) {
      var edit = layer.editing;

      if (edit.toolbar) { edit._hideToolbar(); }

      for (i = 0; i < 4; i++) {
        if (box.contains(layer.getCorner(i)) && edit._mode !== "lock") {
          L.DomUtil.addClass(layer.getElement(), "selected");
          break;
        }
      }
    });
  },

  _getAvgCmPerPixel: function(imgs) {
    var reduce = imgs.reduce(function(sum, img) {
      return sum + img.cm_per_pixel;
    }, 0);
    return reduce / imgs.length;
  },

  _generateExportJson: function() {
    var json = {};
    json.images = [];

    this.eachLayer(function(layer) {
      if (this.isSelected(layer)) {
        json.images.push({
          id: this.getLayerId(layer),
          src: layer._image.src,
          nodes: layer.getCorners(),
          cm_per_pixel: L.ImageUtil.getCmPerPixel(layer)
        });
      }
    }, this);

    json.avg_cm_per_pixel = this._getAvgCmPerPixel(json.images);

    return json;
  },

  _runExport: function(collection) {
    collection = collection || this._generateExportJson();
    $.ajax({
      url: "http://export.mapknitter.org/export",
      crossDomain: true,
      type: "POST",
      data: {
        collection: JSON.stringify(collection.images),
        scale: 30
      },
      success: function _getStatusJson(data) {
        console.log(data);
        $.ajax("http://export.mapknitter.org" + data, {
          type: "GET",
          crossDomain: true
        }).done(function(data) {
          console.log(data);
        });
      }
    });
  },

  _onKeyDown: function(e) {
    if (e.key === "Escape") {
      this._deselectAll(e);
    }
    if (e.key === "Backspace") {
      this._removeFromGroup(e);
    }
  },

  _dragStartMultiple: function(event) {
    var overlay = event.target,
      i;

    if (!this.isSelected(overlay)) { return; }

    this.eachLayer(function(layer) {
      var edit = layer.editing;
      edit._deselect();

      for (i = 0; i < 4; i++) {
        layer._dragStartPoints[i] = layer._map.latLngToLayerPoint(
          layer.getCorner(i)
        );
      }
    });
  },

  _dragMultiple: function(event) {
    var overlay = event.target,
      map = this._map,
      i;

    if (!this.isSelected(overlay)) { return; }

    overlay._dragPoints = {};

    for (i = 0; i < 4; i++) {
      overlay._dragPoints[i] = map.latLngToLayerPoint(overlay.getCorner(i));
    }

    var cpd = overlay._calcCornerPointDelta();

    this._updateCollectionFromPoints(cpd, overlay);
  },

  _deselectAll: function(event) {
    this.eachLayer(function(layer) {
      var edit = layer.editing;
      L.DomUtil.removeClass(layer.getElement(), "selected");
      edit._deselect();
    });

    L.DomEvent.stopPropagation(event);
  },

  _removeFromGroup: function(e) {
    this.eachLayer(function(layer) {
      var edit = layer.editing;
      if (edit._selected && edit._mode !== "lock") {
        var choice = edit.confirmDelete();
        if (choice) {
          edit._selected = false;
          this.removeLayer(layer);
        } else {
          L.DomEvent.stopPropagation(e);
          return;
        }
      }
    }, this);
  },
  /**
   * images in 'lock' mode are included in this feature group collection for functionalities
   * such as export, but are filtered out for editing / dragging here
   */
  _calcCollectionFromPoints: function(cpd, overlay) {
    var layersToMove = [],
      p = new L.Transformation(1, -cpd.x, 1, -cpd.y);

    this.eachLayer(function(layer) {
      if (
        layer !== overlay &&
        layer.editing._mode !== "lock" &&
        this.isSelected(layer)
      ) {
        layer._cpd = {};

        layer._cpd.val0 = p.transform(layer._dragStartPoints[0]);
        layer._cpd.val1 = p.transform(layer._dragStartPoints[1]);
        layer._cpd.val2 = p.transform(layer._dragStartPoints[2]);
        layer._cpd.val3 = p.transform(layer._dragStartPoints[3]);

        layersToMove.push(layer);
      }
    }, this);

    return layersToMove;
  },

  /**
   * cpd === cornerPointDelta
   */
  _updateCollectionFromPoints: function(cpd, overlay) {
    var layersToMove = this._calcCollectionFromPoints(cpd, overlay);

    layersToMove.forEach(function(layer) {
      layer._updateCornersFromPoints(layer._cpd);
      layer.fire("update");
    }, this);
  }
});

L.distortableCollection = function(id, options) {
  return new L.DistortableCollection(id, options);
};
