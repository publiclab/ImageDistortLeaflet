describe('L.DistortableCollection', function() {
  var map, overlay, overlay2, imgGroup;

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
        L.latLng(41.7934, -87.605),
        L.latLng(41.7934, -87.585),
        L.latLng(41.7834, -87.605),
        L.latLng(41.7834, -87.585),
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

  it.skip('Should keep selected images in sync with eachother during translation', function() {});

  it('allows custom export functions to be used', function(done) {
    customImgGroup = L.distortableCollection({
      fetchStatusUrl: function fetchStatusUrl(opts) {
        expect(opts).to.not.be.nil;
        // expand testing of opts; we can test other constructor parameters being passed through here
        done();
      }
    }).addTo(map);

    map.whenReady(function() {
      // isolate a single image in a new collection:
      imgGroup.removeLayer(overlay);
      customImgGroup.addLayer(overlay);
      // simulate selection of an image
// this is selecting in 2 different groups?:
      chai.simulateEvent(overlay.getElement(), 'mousedown', { shiftKey: true });
// this returning false:
      expect(customImgGroup.isCollected(overlay)).to.be.true;

      // test that the collection menu appears and contains an export button
      expect(document.querySelector('.leaflet-toolbar-icon[title="Export Images"]')).to.not.be.null;
      chai.simulateEvent(document.querySelector('.leaflet-toolbar-icon[title="Export Images"]'), 'mousedown');
    });
  });

  it('Adds the layers to the map when they are added to the group', function() {
    expect(map.hasLayer(overlay)).to.be.true;
    expect(map.hasLayer(overlay2)).to.be.true;
    expect(map.hasLayer(overlay3)).to.be.true;
  });

  describe('#isCollected', function() {
    it('Should only return true if the image was selected using shift + mousedown', function() {
      chai.simulateEvent(overlay.getElement(), 'mousedown', { shiftKey: true });
      chai.simulateEvent(overlay2.getElement(), 'mousedown');
      expect(imgGroup.isCollected(overlay)).to.be.true;
      expect(imgGroup.isCollected(overlay2)).to.be.false;
    });
  });

  describe('#anyCollected', function() {
    it('Should return false if no selections were made with shift + mousedown', function() {
      chai.simulateEvent(overlay.getElement(), 'mousedown');
      chai.simulateEvent(overlay2.getElement(), 'mousedown');
      expect(imgGroup.isCollected(overlay)).to.be.false;
      expect(imgGroup.isCollected(overlay2)).to.be.false;
    });
  });

  describe('#_toggleCollected', function() {
    it('Should allow multiple image selection (collection) on shift + click', function() {
      var img = overlay.getElement();
      var img2 = overlay2.getElement();

      chai.simulateEvent(img, 'mousedown', { shiftKey: true });
      chai.simulateEvent(img2, 'mousedown', { shiftKey: true });

      expect(L.DomUtil.getClass(img)).to.include('collected');
      expect(L.DomUtil.getClass(img2)).to.include('collected');
    });

    it('It should allow a locked image to be part of multiple image selection', function() {
      var img = overlay.getElement();

      overlay.editing._toggleLockMode();
      chai.simulateEvent(img, 'mousedown', { shiftKey: true });

      expect(L.DomUtil.getClass(img)).to.include('collected');
    });
  });
});
