describe('L.DistortableImage.Edit', function() {
  var map;
  var overlay;
  var ov2;

  beforeEach(function(done) {
    map = L.map(L.DomUtil.create('div', '', document.body)).setView([41.7896, -87.5996], 15);

    overlay = L.distortableImageOverlay('/examples/example.png', {
      corners: [
        L.latLng(41.7934, -87.6052),
        L.latLng(41.7934, -87.5852),
        L.latLng(41.7834, -87.5852),
        L.latLng(41.7834, -87.6052),
      ],
    }).addTo(map);

    ov2 = L.distortableImageOverlay('/examples/example.png', {
      corners: [
        L.latLng(41.7934, -87.6052),
        L.latLng(41.7934, -87.5852),
        L.latLng(41.7834, -87.5852),
        L.latLng(41.7834, -87.6052),
      ],
      suppressToolbar: true,
    }).addTo(map);

    /* Forces the image to load before any tests are run. */
    L.DomEvent.on(ov2._image, 'load', function() { done(); });

    afterEach(function() {
      L.DomUtil.remove(overlay);
      L.DomUtil.remove(ov2);
    });
  });

  it('Should be initialized along with each instance of L.DistortableImageOverlay.', function() {
    expect(overlay.editing).to.be.an.instanceOf(L.DistortableImage.Edit);
    expect(ov2.editing).to.be.an.instanceOf(L.DistortableImage.Edit);
  });

  it('Should keep handles on the map in sync with the corners of the image.', function() {
    var corners = overlay.getCorners();
    var edit = overlay.editing;
    var img = overlay.getElement();

    edit.enable();
    // this test applies to a selected image
    chai.simulateEvent(img, chai.mouseEvents.Click);

    overlay.setCorner(0, L.latLng(41.7934, -87.6252));

    /* Warp handles are currently on the map; they should have been updated. */
    edit._distortHandles.eachLayer(function(handle) {
      expect(handle.getLatLng()).to.be.closeToLatLng(corners[handle._corner]);
    });

    edit._freeRotateMode();

    /* After we toggle modes, the freeRotateHandles are on the map and should be synced. */
    edit._freeRotateHandles.eachLayer(function(handle) {
      expect(handle.getLatLng()).to.be.closeToLatLng(corners[handle._corner]);
    });
  });

  describe('#nextMode', function () {
    beforeEach(function() {
      overlay.editing.enable();
      overlay.select();
    });

    it('Should update image\'s mode to the next in its modes array', function() {
      var edit = overlay.editing;
      var modes = Object.keys(edit.getModes());

      edit._mode = 'distort'
      var idx = modes.indexOf('distort');

      var newIdx = modes.indexOf(edit.nextMode()._mode)
      expect(newIdx).to.equal((idx + 1) % modes.length)
    });

    it('Will only update if the image is selected, or nextMode was triggerd by dblclick', function() {
      var edit = overlay.editing;

      overlay.deselect();
      expect(edit.nextMode()).to.be.false

      chai.simulateEvent(overlay.getElement(), chai.mouseEvents.Dblclick);
      setTimeout(function () {
        expect(edit.nextMode()).to.be.ok
      }, 3000);
    });

    it('It prevents dblclick events from propagating to the map', function() {
      var overlaySpy = sinon.spy();
      var mapSpy = sinon.spy();

      overlay.on('dblclick', overlaySpy);
      map.on('dblclick', mapSpy);
      
      overlay.fire('dblclick');

      setTimeout(function () {
        expect(overlay.editing.nextMode).to.have.been.called;
        expect(L.DomEvent.stop).to.have.been.called;

        expect(overlaySpy.called).to.be.true;
        expect(mapSpy.notCalled).to.be.true;
      }, 3000);
    });

    it('Should call #setMode', function () {
      var overlaySpy = sinon.spy();
      overlay.on('dblclick', overlaySpy);

      overlay.fire('dblclick');
      expect(overlay.editing.setMode).to.have.been.called;
    });

    it('Will still update the mode of an initialized image with suppressToolbar: true', function() {
      ov2.select();
      expect(ov2.editing.toolbar).to.be.undefined
      expect(ov2.editing.nextMode()).to.be.ok
    })
  });

  describe('#setMode', function() {
    it('Will return false if the passed value is not in the image\'s modes array', function() {
      var edit = overlay.editing;
      overlay.select();
      expect(edit.setMode('lock')).to.be.ok
      expect(edit.setMode('blah')).to.be.false
    });

    it('Will return false if the image is not selected', function() {
      var edit = overlay.editing;
      expect(edit.setMode('lock')).to.be.false
    });

    it('Will return false if the passed mode is already the images mode', function() {
      var edit = overlay.editing;
      overlay.select();
      expect(edit.setMode('lock')).to.be.ok
      expect(edit.setMode('lock')).to.be.false
    });

    it('Will still update the mode of an initialized image with suppressToolbar: true', function () {
      ov2.select();
      expect(ov2.editing.toolbar).to.be.undefined
      expect(ov2.editing.setMode('lock')).to.be.ok
    })
  });

  describe('#addTool', function() {
    it('Adds the passed tool to the end of the toolbar array', function() {
      var edit = overlay.editing;
      var tool = L.StackAction;

      expect(edit.hasTool(tool)).to.be.false
      edit.addTool(tool);
      expect(edit.hasTool(tool)).to.be.true
    });

    it('Does not add a tool that is already present', function() {
      var edit = overlay.editing;
      var tool = L.StackAction;

      expect(edit.addTool(tool)).to.be.ok
      expect(edit.addTool(tool)).to.be.false
    });
  });

  describe('#removeTool', function() {
    it('Removes the passed tool from the toolbar', function() {
      var edit = overlay.editing;
      var tool = L.BorderAction;

      expect(edit.hasTool(tool)).to.be.true
      edit.removeTool(tool);
      expect(edit.hasTool(tool)).to.be.false
    });

    it('Returns false if the tool is not in the toolbar', function() {
      var edit = overlay.editing;
      var tool = L.StackAction;

      expect(edit.hasTool(tool)).to.be.false
      expect(edit.removeTool(tool)).to.be.false
    });
  });
});
