describe("L.DistortableImage.Edit", function() {
	var map,
		overlay;

	beforeEach(function(done) {
		map = L.map(L.DomUtil.create('div', '', document.body)).setView([41.7896,-87.5996], 15);

		overlay = new L.DistortableImageOverlay('/examples/example.png', {
			corners: [
				new L.LatLng(41.7934, -87.6052),
				new L.LatLng(41.7934, -87.5852),
				new L.LatLng(41.7834, -87.5852),
				new L.LatLng(41.7834, -87.6052)
			]
		}).addTo(map);

		/* Forces the image to load before any tests are run. */
		L.DomEvent.on(overlay._image, 'load', function() { done (); });
	});

	it("Should be initialized along with each instance of L.DistortableImageOverlay.", function() {
		expect(overlay.editing).to.be.an.instanceOf(L.DistortableImage.Edit);
	});

	it("Should keep handles on the map in sync with the corners of the image.", function() {
		var corners = overlay.getCorners(),
			edit = overlay.editing;

		edit.enable();
		edit._selected = true;
		overlay._updateCorner(0, new L.LatLng(41.7934, -87.6252));

		overlay.fire('update');
		
		/* Warp handles are currently on the map; they should have been updated. */
		edit._distortHandles.eachLayer(function(handle) {
			expect(handle.getLatLng()).to.be.closeToLatLng(corners[handle._corner]);
		});

		edit._toggleRotateScale();

		/* After we toggle modes, the rotateScaleHandles are on the map and should be synced. */
		edit._rotateScaleHandles.eachLayer(function(handle) {
			expect(handle.getLatLng()).to.be.closeToLatLng(corners[handle._corner]);
		});
	});

	it.skip("Should keep image in sync with the map while dragging.", function() {
		var edit = overlay.editing,
			dragging;

		edit.enable();

		dragging = edit.dragging;

		/* _reset is not called by #onAdd, for some reason... */
		overlay._reset();

		/* Simulate a sequence of drag events. */
		dragging._onDown({ touches: [{ clientX: 0, clientY: 0 }], target: overlay._image });
		dragging._onMove({ touches: [{ clientX: 20, clientY: 30 }], target: overlay._image });
		dragging._onUp();

		map.setView([41.7896,-87.6996]);
	});
});
