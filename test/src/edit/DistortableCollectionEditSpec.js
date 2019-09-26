describe('L.DistortableCollection.Edit', function() {
  var map;
  var overlay;
  var overlay2;
  var imgGroup;

  beforeEach(function(done) {
    map = L.map(L.DomUtil.create('div', '', document.body)).setView([41.7896, -87.5996], 15);

    overlay = L.distortableImageOverlay('/examples/example.png', {
      corners: [
        L.latLng(41.7934, -87.6052),
        L.latLng(41.7934, -87.5852),
        L.latLng(41.7834, -87.6052),
        L.latLng(41.7834, -87.5852),
      ],
    });

    overlay2 = L.distortableImageOverlay('/examples/example.png', {
      corners: [
        L.latLng(41.7934, -87.6050),
        L.latLng(41.7934, -87.5850),
        L.latLng(41.7834, -87.6050),
        L.latLng(41.7834, -87.5850),
      ],
    });

    overlay3 = L.distortableImageOverlay('/examples/example.png', {
      corners: [
        L.latLng(41.7934, -87.6054),
        L.latLng(41.7934, -87.5854),
        L.latLng(41.7834, -87.6054),
        L.latLng(41.7834, -87.5854),
      ],
    });

    imgGroup = L.distortableCollection().addTo(map);

    imgGroup.addLayer(overlay);
    imgGroup.addLayer(overlay2);
    imgGroup.addLayer(overlay3);

    /* Forces the images to load before any tests are run. */
    L.DomEvent.on(overlay3, 'load', function() { done(); });
  });

  afterEach(function() {
    imgGroup.removeLayer(overlay);
    imgGroup.removeLayer(overlay2);
    imgGroup.removeLayer(overlay3);
  });

  describe('#_decollectAll', function() {
    it('should remove the \'selected\' class from all images', function() {
      var img = overlay.getElement();
      var img2 = overlay2.getElement();

      L.DomUtil.addClass(img, 'collected');
      L.DomUtil.addClass(img2, 'collected');
      map.fire('click');
      // we deselect after 3ms to confirm the click wasn't a dblclick
      setTimeout(function() {
        expect(L.DomUtil.getClass(img)).to.not.include('collected');
        expect(L.DomUtil.getClass(img2)).to.not.include('collected');
      }, 3000);
    });

    it('should hide all images\' handles unless they\'re lock handles', function() {
      var edit = overlay.editing;
      var edit2 = overlay2.editing;
      // turn on lock handles for one of the DistortableImageOverlay instances.
      edit2._lock();
      map.fire('click'); // then trigger _decollectAll

      setTimeout(function() {
        edit.currentHandles.eachLayer(function(handle) {
          var icon = handle.getElement();
          expect(L.DomUtil.getStyle(icon, 'opacity')).to.eql('0');
        });
        // opacity for lockHandles is unset because we never altered it to hide it as part of deselection
        edit2.currentHandles.eachLayer(function(handle) {
          var icon = handle.getElement();
          expect(L.DomUtil.getStyle(icon, 'opacity')).to.eql('');
        });
      }, 3000);
    });

    it('should remove an image\'s individual toolbar instances regardless of lock handles', function() {
      var edit2 = overlay2.editing;
      edit2._lock();
      // select image to initially create individual toolbar instance (single selection interface)
      simulateEvent(overlay2.getElement(), 'click');
      expect(edit2.toolbar).to.not.be.false;

      map.fire('click'); // then trigger _decollectAll
      setTimeout(function() {
        expect(edit2.toolbar).to.be.false;
      }, 3000);
    });
  });

  describe('#_addToolbar', function() {
    it('is invoked on the click event that follows mousedown multi-select', function() {
      expect(map._toolbars).to.be.empty;
      // need both bc simulated `mousedown`s don't fire `click` events afterwards like regular user generated `mousedown`s.
      simulateEvent(overlay.getElement(), 'mousedown', {shiftKey: true});
      simulateEvent(overlay.getElement(), 'click');
      expect(Object.keys(map._toolbars)).to.have.lengthOf(1);
    });

    it('it adds a control toolbar to the map', function() {
      expect(map._toolbars).to.be.empty;
      imgGroup.editing._addToolbar();
      expect(Object.keys(map._toolbars)).to.have.lengthOf(1);
      expect(Object.keys(map._toolbars)[0]._container).className = 'leaflet-control';
    });

    it('does not add multiple instances of a control toolbar', function() {
      expect(map._toolbars).to.be.empty;
      imgGroup.editing._addToolbar();
      imgGroup.editing._addToolbar();
      expect(Object.keys(map._toolbars)).to.have.lengthOf(1);
    });
  });

  describe('#_removeToolbar', function() {
    beforeEach(function() { // multi-select the image and add the toolbar
      simulateEvent(overlay.getElement(), 'mousedown', {shiftKey: true});
      imgGroup.editing._addToolbar();

      expect(Object.keys(map._toolbars)).to.have.lengthOf(1);
    });

    it('is invoked on map click', function() {
      var edit = imgGroup.editing;
      var spy = sinon.spy(edit, '_removeToolbar');

      map.fire('click');

      setTimeout(function() {
        expect(spy.called).to.be.ok;
        edit._removeToolbar.restore();
      }, 3000);
    });

    it('is invoked on shift + mousedown when it toggles the image *out* of multi-select', function() {
      var edit = imgGroup.editing;
      var spy = sinon.spy(edit, '_removeToolbar');
      // uncollecting the last collected image removes the control toolbar
      simulateEvent(overlay.getElement(), 'mousedown', {shiftKey: true});
      setTimeout(function () {
        expect(map._toolbars).to.be.empty;
        expect(spy.called).to.be.ok;
        edit._removeToolbar.restore();
      }, 3000);
    });

    it('it removes a control toolbar from the map', function() {
      imgGroup.editing._removeToolbar();
      expect(map._toolbars).to.be.empty;
    });

    it('it returns false if there was no control toolbar to remove', function() {
      expect(imgGroup.editing._removeToolbar()).to.not.be.false;
      expect(imgGroup.editing._removeToolbar()).to.be.false;
    });
  });

  describe('#_lockGroup', function() {
    beforeEach(function() {
      simulateEvent(overlay.getElement(), 'mousedown', {shiftKey: true});
      simulateEvent(overlay3.getElement(), 'mousedown', {shiftKey: true});
      imgGroup.editing._lockGroup();
    });

    it('it only puts the multi-selected images in lock mode', function() {
      expect(overlay.editing.isMode('lock')).to.be.true;
      expect(overlay3.editing.isMode('lock')).to.be.true;

      expect(overlay2.editing.isMode('lock')).to.not.be.true;
    });

    it('does not toggle lock mode', function() {
      imgGroup.editing._lockGroup();
      expect(overlay.editing.isMode('lock')).to.be.true;
    });

    it('prevents images in that group from being dragged', function() {
      expect(overlay.editing.dragging).to.be.undefined;
      expect(overlay3.editing.dragging).to.be.undefined;

      expect(overlay2.editing.dragging).to.be.an.instanceOf(L.Draggable);
    });
  });

  describe('#_unlockGroup', function() {
    beforeEach(function() {
      simulateEvent(overlay.getElement(), 'mousedown', {shiftKey: true});
      simulateEvent(overlay2.getElement(), 'mousedown', {shiftKey: true});
      simulateEvent(overlay3.getElement(), 'mousedown', {shiftKey: true});
      imgGroup.editing._lockGroup();
      expect(overlay.editing.isMode('lock')).to.be.true;
    });

    it('it removes the collected images from lock mode', function() {
      imgGroup.editing._unlockGroup();
      expect(overlay.editing.isMode('lock')).to.be.false;
    });

    it('does not toggle lock mode', function() {
      imgGroup.editing._unlockGroup();
      imgGroup.editing._unlockGroup();
      expect(overlay.editing.isMode('lock')).to.be.false;
    });
  });

  describe('#_removeGroup', function() {
    beforeEach(function() { // multi-selects the images to add them to the feature group
      simulateEvent(overlay.getElement(), 'mousedown', {shiftKey: true});
      simulateEvent(overlay3.getElement(), 'mousedown', {shiftKey: true});
    });

    it('removes a collection of layers', function() {
      var layers = imgGroup.getLayers();
      expect(layers).to.include.members([overlay, overlay2, overlay3]);

      imgGroup.editing._removeGroup();

      expect(layers).to.not.have.members([overlay, overlay3]);
      expect(layers).to.include.members([overlay2]);
    });

    it('removes the layers from the map on removal from group', function() {
      var id = imgGroup.getLayerId(overlay);
      var id2 = imgGroup.getLayerId(overlay2);
      var id3 = imgGroup.getLayerId(overlay3);

      expect(map._layers).to.include.all.keys(id, id2, id3);

      imgGroup.editing._removeGroup();

      expect(map._layers).to.not.have.all.keys(id, id3);
      expect(map._layers).to.include.all.keys(id2);
    });
  });
});
