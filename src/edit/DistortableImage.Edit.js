L.DistortableImage = L.DistortableImage || {};

L.DistortableImage.Edit = L.Handler.extend({
	options: {
		opacity: 0.7,
		outline: '1px solid red',
		keymap: {
			68: '_toggleRotateDistort', // d
			69: '_toggleExport', // e 
			73: '_toggleIsolate', // i
			76: '_toggleLock', // l
			79: '_toggleOutline', // o
			82: '_toggleRotateDistort', // r
			84: '_toggleTransparency' // t
		}
	},

	initialize: function (overlay){
		this._overlay = overlay;

		/* Interaction modes. */
		this._mode = this._overlay.options.mode || 'distort';
		this._transparent = false;
		this._outlined = false;
	},

	/* Run on image selection. */
	addHooks: function (){
		var overlay = this._overlay,
			map = overlay._map,
			i;

		this._lockHandles = new L.LayerGroup();
		for (i = 0; i < 4; i++)
		{
			this._lockHandles.addLayer(new L.LockHandle(overlay, i, { draggable: false }));
		}

		this._distortHandles = new L.LayerGroup();
		for (i = 0; i < 4; i++)
		{
			this._distortHandles.addLayer(new L.DistortHandle(overlay, i));
		}

		this._rotateHandles = new L.LayerGroup();
		for (i = 0; i < 4; i++)
		{
			this._rotateHandles.addLayer(new L.RotateHandle(overlay, i));
		}

		this._handles = {
			'lock': this._lockHandles,
			'distort': this._distortHandles,
			'rotate': this._rotateHandles
		};

		if (this._mode === 'lock')
		{
			map.addLayer(this._lockHandles);
		} else
		{
			this._mode = 'distort';
			map.addLayer(this._distortHandles);
			this._enableDragging();
		}

		//overlay.on('click', this._showToolbar, this);
		L.DomEvent.on(overlay._image, 'click', this._showToolbar, this);

		/* Enable hotkeys. */
		L.DomEvent.on(window, 'keydown', this._onKeyDown, this);

		overlay.fire('select');

	},

	/* Run on image deseletion. */
	removeHooks: function (){
		var overlay = this._overlay,
			map = overlay._map;

		// L.DomEvent.off(window, 'keydown', this._onKeyDown, this);

		L.DomEvent.off(overlay._image, 'click', this._showToolbar, this);

		// First, check if dragging exists;
		// it may be off due to locking
		if (this.dragging) { this.dragging.disable(); }
		delete this.dragging;

		map.removeLayer(this._handles[this._mode]);

		/* Disable hotkeys. */
		L.DomEvent.off(window, 'keydown', this._onKeyDown, this);

		overlay.fire('deselect');
	},

	_rotateBy: function (angle){
		var overlay = this._overlay,
			map = overlay._map,
			center = map.latLngToLayerPoint(overlay.getCenter()),
			i, p, q;

		for (i = 0; i < 4; i++)
		{
			p = map.latLngToLayerPoint(overlay._corners[i]).subtract(center);
			q = new L.Point(
				Math.cos(angle) * p.x - Math.sin(angle) * p.y,
				Math.sin(angle) * p.x + Math.cos(angle) * p.y
			);
			overlay._corners[i] = map.layerPointToLatLng(q.add(center));
		}

		overlay._reset();
	},

	_scaleBy: function (scale){
		var overlay = this._overlay,
			map = overlay._map,
			center = map.latLngToLayerPoint(overlay.getCenter()),
			i, p;

		for (i = 0; i < 4; i++)
		{
			p = map.latLngToLayerPoint(overlay._corners[i])
				.subtract(center)
				.multiplyBy(scale)
				.add(center);
			overlay._corners[i] = map.layerPointToLatLng(p);
		}

		overlay._reset();
	},

	_enableDragging: function (){
		var overlay = this._overlay,
			map = overlay._map;

		this.dragging = new L.Draggable(overlay._image);
		this.dragging.enable();

		/* Hide toolbars while dragging; click will re-show it */
		this.dragging.on('dragstart', this._hideToolbar, this);

		/* 
		 * Adjust default behavior of L.Draggable.
		 * By default, L.Draggable overwrites the CSS3 distort transform 
		 * that we want when it calls L.DomUtil.setPosition.
		 */
		this.dragging._updatePosition = function ()
		{
			var delta = this._newPos.subtract(map.latLngToLayerPoint(overlay._corners[0])),
				currentPoint, i;

			this.fire('predrag');

			for (i = 0; i < 4; i++)
			{
				currentPoint = map.latLngToLayerPoint(overlay._corners[i]);
				overlay._corners[i] = map.layerPointToLatLng(currentPoint.add(delta));
			}
			overlay._reset();
			overlay.fire('update');

			this.fire('drag');
		};
	},

	_onKeyDown: function (event){
		var keymap = this.options.keymap,
			handlerName = keymap[event.which];

		if (handlerName !== undefined)
		{
			this[handlerName].call(this);
		}
	},

	_toggleRotateDistort: function (){
		var map = this._overlay._map;

		map.removeLayer(this._handles[this._mode]);

		/* Switch mode. */
		if (this._mode === 'rotate') { this._mode = 'distort'; }
		else { this._mode = 'rotate'; }

		map.addLayer(this._handles[this._mode]);
	},

	_toggleTransparency: function (){
		var image = this._overlay._image,
			opacity;

		this._transparent = !this._transparent;
		opacity = this._transparent ? this.options.opacity : 1;

		L.DomUtil.setOpacity(image, opacity);
		image.setAttribute('opacity', opacity);
	},

	_toggleOutline: function (){
		var image = this._overlay._image,
			opacity, outline;

		this._outlined = !this._outlined;
		opacity = this._outlined ? this.options.opacity / 2 : 1;
		outline = this._outlined ? this.options.outline : 'none';

		L.DomUtil.setOpacity(image, opacity);
		image.setAttribute('opacity', opacity);

		image.style.outline = outline;
	},

	_toggleLock: function (){
		var map = this._overlay._map;

		map.removeLayer(this._handles[this._mode]);
		/* Switch mode. */
		if (this._mode === 'lock')
		{
			this._mode = 'distort';
			this._enableDragging();
		} else
		{
			this._mode = 'lock';
			if (this.dragging) { this.dragging.disable(); }
			delete this.dragging;
		}

		map.addLayer(this._handles[this._mode]);
	},

	// Based on https://github.com/publiclab/mapknitter/blob/8d94132c81b3040ae0d0b4627e685ff75275b416/app/assets/javascripts/mapknitter/Map.js#L47-L82
	_toggleExport: function (){
		var map = this._overlay._map; 
		var overlay = this._overlay;
		var image = overlay._image;

		image.id = "thisImageId";

		var imgEl = $(image.id);

		var height = image.height,
			width = image.width,
			nw = map.latLngToLayerPoint(overlay._corners[0]),
			ne = map.latLngToLayerPoint(overlay._corners[1]),
			sw = map.latLngToLayerPoint(overlay._corners[2]),
			se = map.latLngToLayerPoint(overlay._corners[3]);

		// I think this is to move the image to the upper left corner, but I don't think it's necessary in this case
		//nw.x -= nw.x;
		//ne.x -= nw.x;
		//se.x -= nw.x;
		//sw.x -= nw.x;

		//nw.y -= nw.y;
		//ne.y -= nw.y;
		//se.y -= nw.y;
		//sw.y -= nw.y;

		warpWebGl(
			image.id,
			[0, 0, width, 0, width, height, 0, height],
			[nw.x, nw.y, ne.x, ne.y, se.x, se.y, sw.x, sw.y],
			true // trigger download
		);

		imgEl.src = image.getAttribute('data-image');

	},

	_hideToolbar: function (){
		var map = this._overlay._map;
		if (this.toolbar)
		{
			map.removeLayer(this.toolbar);
			this.toolbar = false;
		}
	},

	_showToolbar: function (event){
		var overlay = this._overlay,
			target = event.target,
			map = overlay._map;

		/* Ensure that there is only ever one toolbar attached to each image. */
		this._hideToolbar();
		var point;
		if (event.containerPoint) { point = event.containerPoint; }
		else { point = target._leaflet_pos; }
		var raised_point = map.containerPointToLatLng(new L.Point(point.x, point.y - 20));
		raised_point.lng = overlay.getCenter().lng;
		this.toolbar = new L.DistortableImage.EditToolbar(raised_point).addTo(map, overlay);
		overlay.fire('toolbar:created');

		L.DomEvent.stopPropagation(event);
	},

	toggleIsolate: function (){
		// this.isolated = !this.isolated;
		// if (this.isolated) {
		// 	$.each($L.images,function(i,img) {
		// 		img.hidden = false;
		// 		img.setOpacity(1);
		// 	});
		// } else {
		// 	$.each($L.images,function(i,img) {
		// 		img.hidden = true;
		// 		img.setOpacity(0);
		// 	});
		// }
		// this.hidden = false;
		// this.setOpacity(1);
	}

});

L.DistortableImageOverlay.addInitHook(function (){
	this.editing = new L.DistortableImage.Edit(this);

	if (this.options.editable)
	{
		L.DomEvent.on(this._image, 'load', this.editing.enable, this.editing);
	}

	this.on('remove', function ()
	{
		if (this.editing) { this.editing.disable(); }
	});
});
