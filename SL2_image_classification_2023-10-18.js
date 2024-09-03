// SET PRIORS

Map.setOptions("HYBRID"); // set default map background

// Set start and end date of time period in which median satellite imageries will be generated.

var TARGETDATE = "20231018";
var STARTDAY = "2023-10-17";
var ENDDAY = "2023-10-19";
var cloud_treshold = 10; // max per cent of sky covered by clouds

// NDWI and NDVI thresholds
var ndwi_threshold = -0.04; // value of NDWI above this indicates water
var ndvi_threshold = 0.37;  // value of NDVI above this indicates closed vegetation

// Name of feature (column) with class IDs
var classID = "class_id"; // single water class

// Number of classes in a classification
var num_of_classes = 5; // Number of classes in final classification

var classification_method = 'RF'; // Classifier of choice

// SET AOI
// Area of interest within we are going to classify habitat types
// Defined as watermask as of 1 day before the dam breached

var AOI = ee.FeatureCollection('users/olegpril12/Kakhovka/kakhovka_watershield');

var name_area = 'Kakhovka'; // area name, which will be used in exported file naming

Map.centerObject(AOI, 8);

// CLOUD MASK

/**
 * Function to mask clouds using the Sentinel-2 QA band
 * @param {ee.Image} image Sentinel-2 image
 * @return {ee.Image} cloud masked Sentinel-2 image
 */
function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000);
}

// Receiving satellite imageries for defined timespans 
var pre_med = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                  .filterBounds(AOI)
                  .filterDate(STARTDAY, ENDDAY)
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', cloud_treshold))
                  .map(maskS2clouds)
                  .select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12']);

// Print data on selected images to the console
print('downloaded images: ', pre_med);

// Medinaize images and then clip the result by AOI
var med = pre_med.median().clip(AOI);

// Print resulting image properties
print('median image: ', med);

// Set visual preview of obtained imagery
var rgbVis_natural_color = {
  min: 0.0,
  max: 0.3,
  bands: ['B4', 'B3', 'B2'],
};

// Add RGB Sentinel-2 median image to the map

Map.addLayer(med.clip(AOI), rgbVis_natural_color, 'Sentinel-2, 19 October 2023');

// Add vector boundary of AOI

var empty = ee.Image().byte();
var outline = empty.paint({
  featureCollection: AOI,
  color: 1,
  width: 1
});

Map.addLayer(outline, {palette: 'FF0000'}, 'AOI');

// Calculate NDWI and create watermask
var ndwi = med.normalizedDifference(['B3', 'B8']).rename('NDWI');
var watermask = ndwi.gt(ndwi_threshold);

// Add NDWI to the map
var ndwiVis = {
  min: -1,
  max: 1,
  palette: ['00FFFF', '0000FF'],
};
Map.addLayer(ndwi, ndwiVis, 'NDWI');

// Color palette for water bodies
var palette_cl = [
  '76B947', // (0) not water
  '05668d', // (1) water
  ];

// Add water bodies to the map
Map.addLayer(watermask.clip(AOI).selfMask(), 
                      {min: 0, max: 1, palette: palette_cl},
                      'Water bodies NDWI');
                      
// Add Sentinel-1 watermask
var sl1_watermask = ee.Image('users/olegpril12/Kakhovka/Kakhovka_watermask_20231018');

// Add water bodies to the map
Map.addLayer(sl1_watermask.clip(AOI).selfMask(), 
                      {min: 0, max: 1, palette: palette_cl},
                      'Water bodies SL-1');

// Calculate NDVI
var ndvi = med.normalizedDifference(['B8', 'B4']).rename('NDVI');

// Add NDVI to the map
var ndviVis = {
  min: -1,
  max: 1,
  palette: ['FF0000', '00FF00'],
};
Map.addLayer(ndvi, ndviVis, 'NDVI');

// Load vector layer with ground truth data
var train_fc = ee.FeatureCollection('users/olegpril12/Kakhovka/2023_wWater');

// Selected optical bands only
var bands = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12'];

// Sample the input imagery to get a FeatureCollection of training data for all habitat types
var sampled = med.select(bands).sampleRegions({
  collection: train_fc,
  properties: [classID],
  scale: 10,
});

// Export sampled pixel values to the drive
Export.table.toDrive({
  collection: ee.FeatureCollection(sampled), 
  description: 'Sampled_pixels_'+name_area+'_'+TARGETDATE, 
  folder: 'GEE data',
  fileFormat: 'CSV',
});

var training = sampled.randomColumn({ seed: 1 }).filter(ee.Filter.lt('random', 0.7));
var validation = sampled.randomColumn({ seed: 1 }).filter(ee.Filter.gte('random', 0.7));

// Make a Random Forest classifier and train it for all habitat types
var classifier = ee.Classifier.smileRandomForest({ numberOfTrees: 30 })
    .train({
      features: training,
      classProperty: classID,
      inputProperties: bands
    });

// Classify the entire image
var classified = med.classify(classifier);

// Evaluate classifier
var trainAccuracy = classifier.confusionMatrix();

var confusionMatrix = ee.ConfusionMatrix(validation.classify(classifier)
    .errorMatrix({
      actual: classID,
      predicted: 'classification',
    }));

print('Confusion matrix:', confusionMatrix);
print('Overall Accuracy:', confusionMatrix.accuracy());
print('Kappa:', confusionMatrix.kappa());

var exportAccuracy = ee.Feature(null, {matrix: trainAccuracy.array()});
var exportConfusionMatrix = ee.Feature(null, {matrix: confusionMatrix.array()});
var exportKappa = ee.Feature(null, {matrix: confusionMatrix.kappa()});
var exportOverallAccuracy = ee.Feature(null, {matrix: confusionMatrix.accuracy()});

Export.table.toDrive({
  collection: ee.FeatureCollection(exportAccuracy), 
  description: 'Confusion_matrix_'+name_area+'_'+TARGETDATE+'_'+classification_method, 
  folder: 'GEE data',
  fileFormat: 'CSV',
});

Export.table.toDrive({
  collection: ee.FeatureCollection(exportConfusionMatrix), 
  description: 'Confusion_matrix_validation_'+name_area+'_'+TARGETDATE+'_'+classification_method, 
  folder: 'GEE data',
  fileFormat: 'CSV',
});

Export.table.toDrive({
  collection: ee.FeatureCollection(exportKappa), 
  description: 'Kappa_'+name_area+'_'+TARGETDATE+'_'+classification_method, 
  folder: 'GEE data',
  fileFormat: 'CSV',
});

Export.table.toDrive({
  collection: ee.FeatureCollection(exportOverallAccuracy), 
  description: 'Overall_Accuracy_'+name_area+'_'+TARGETDATE+'_'+classification_method, 
  folder: 'GEE data',
  fileFormat: 'CSV',
});

// Colour palette for combined classification
var combinedPalette = [
  '1f8c66', // (1) Willow thickets
  'abca43', // (2) Marshy vegetation
  'ece4b7', // (3) Shells and sands
  '7b3d6c', // (4) Muddy sediments
  '2785bc'  // (5) Water
];

// Display the classification result and the input image.
Map.addLayer(classified.clip(AOI), {min: 1, max: 5, palette: combinedPalette}, 
              'Combined Classification 2023');

// Export classification results to Assets
Export.image.toAsset({
  image: classified.clip(AOI),
  description: name_area+'_classified_'+TARGETDATE+'_'+classification_method,
  assetId: 'Kakhovka/Kakhovka_classified_'+TARGETDATE+'_'+classification_method,
  region: AOI,
  scale: 10,
  crs: 'EPSG:4326',
  maxPixels: 1e10
});

// Median raster of Sentinel L2A
// Export the median raster of Sentinel-2 L2A imagery to your Google Drive
Export.image.toDrive({
  image: med.clip(AOI),
  description: name_area+'_median_'+TARGETDATE,
  folder: 'GEE data',
  fileNamePrefix: name_area+'_median_'+TARGETDATE,
  region: AOI,
  scale: 10,
  crs: 'EPSG:4326',
  maxPixels: 1e10
});

// Export the classification result as a GeoTIFF to Google Drive
Export.image.toDrive({
  image: classified.clip(AOI),
  description: name_area+'_classified_'+TARGETDATE+'_'+classification_method,
  folder: 'GEE data',
  fileNamePrefix: name_area+'_classified_'+TARGETDATE+'_'+classification_method,
  region: AOI,
  scale: 10,
  crs: 'EPSG:4326',
  maxPixels: 1e10
});

// Export the classification result as a GeoTIFF to your Assets
Export.image.toAsset({
  image: classified.clip(AOI),
  description: name_area+'_classified_'+TARGETDATE+'_'+classification_method+'_toAsset',
  assetId: 'Kakhovka/Kakhovka_classified_'+TARGETDATE+'_'+classification_method+'_toAsset',
  region: AOI,
  scale: 10,
  crs: 'EPSG:4326',
  maxPixels: 1e10
});

// End of script
