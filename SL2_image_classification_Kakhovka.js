
//  SET PRIORS

Map.setOptions("HYBRID"); // set default map background

// Set start and end date of time period in which median satellite imageries will be generated.

var STARTDAY = "2023-10-07";
var ENDDAY   = "2023-11-07";  

var cloud_treshold = 10; // max per cent of sky covered by clouds

// Name of feature (column) with class IDs

var classID = "class_id"; // single water class

// Number of classes in a classification
// Specify 5 or 6, depends on how we treat shallow water

var num_of_classes = 4;

//  SET AOI
//  Area of interest within we are going to classify habitat types
//  Defined as watermask as of 1 day before the dam breached

var AOI = ee.FeatureCollection('users/olegpril12/Kakhovka/kakhovka_watershield');

var watermask = ee.Image('users/olegpril12/Kakhovka/Kakhovka_watermask_20231107');

var name_area = 'Kakhovka'; // area name, which will be used in exported file naming

Map.centerObject(AOI, 8);

//  CLOUD MASK

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

// Set visual previev of obtained imagery
var rgbVis_natural_color = {
  min: 0.0,
  max: 0.3,
  bands: ['B4', 'B3', 'B2'],
};


//  Add RGB Sentiel-2 median image to the map

Map.addLayer(med.clip(AOI), rgbVis_natural_color, 'natural_color');

// Add vector boundary of AOI

var empty = ee.Image().byte();
var outline = empty.paint({
  featureCollection: AOI,
  color: 1,
  width: 1
});

Map.addLayer(outline, {palette: 'FF0000'}, 'AOI');


// SUPERVISED CLASSIFICATION

// Load vector layer with ground truth data

var train_fc = ee.FeatureCollection('users/olegpril12/Kakhovka/trainings_poly_woWater');

// Print features of the input vector layer
print('Training areas', train_fc);

// Selected optical bands only

var bands = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12'];

// Sample the input imagery to get a FeatureCollection of training data.

var sampled = med.select(bands).sampleRegions({
  collection: train_fc,
  properties: [classID],
// geometries: true,
  scale: 10,
});


/*
The first step is to partition the set of known values into training and testing sets.
Reusing the classification training set, add a column of random numbers used to 
partition the known data where about 70% of the data will be used for training and 
30% for testing:
*/

var trainingTesting = sampled.randomColumn({
  seed: 1 // set seed for reproducible partitioning
});

var split = 0.7;
var training = trainingTesting.filter(ee.Filter.lt('random', split));
var validation = trainingTesting.filter(ee.Filter.gte('random', split));


// Print an amount of pixels in training and testing sapmples
print('All sampled pixels:', sampled.size());
print('Training data', training.size());
print('Testing areas', validation.size());


//  RANDOM FOREST SUPERVISED IMAGE CLASSIFICATION

// Make a Random Forest classifier and train it.
var classifier = ee.Classifier.smileRandomForest({
    numberOfTrees: 30,
})
    .train({
      features: training,
      classProperty: classID,
      inputProperties: bands
    });



// Apply watermask to the median SL2 image
var med_masked = med.updateMask(watermask.lt(1));

// // Add median Sentinel 2 RGB composite to the map
// Map.addLayer(med_masked.clip(AOI), rgbVis_natural_color, 'Sentinel 2 Watermasked');

// Color palette for water bodies
var palette_cl = [
  '76B947', // (0) not water
  '05668d', // (1) water
  ];

// Add water bodies to the map
Map.addLayer(watermask.clip(AOI).selfMask(), 
                      {min: 0, max: 1, palette: palette_cl},
                      'Water bodies');


// Classify the input masked imagery.
var classified = med_masked.classify(classifier);

// Print classification outputs to the console
print('classified: ', classified);

// Get a confusion matrix representing resubstitution accuracy.
var trainAccuracy = classifier.confusionMatrix();
print('Resubstitution error matrix: ', trainAccuracy);
print('Training overall accuracy: ', trainAccuracy.accuracy());

/*
// Set and export the confusion matrix to CSV file

var exportAccuracy = ee.Feature(null, {matrix: trainAccuracy.array()})

Export.table.toDrive({
  collection: ee.FeatureCollection(exportAccuracy), 
  description: 'Confision_matrix_'+name_area+'_'+STARTDAY+'_'+ENDDAY, 
  folder: 'GEE data',
  fileFormat: 'CSV',
});
*/

// Classify the testing set and get a confusion matrix. Note that the classifier 
// automatically adds a property called 'classification', which is compared to the 
// 'class' property added when you imported your polygons:

var confusionMatrix = ee.ConfusionMatrix(validation.classify(classifier)
    .errorMatrix({
      actual: classID,
      predicted: 'classification',
    }));
    
// Print the confusion matrix and expand the object to inspect the matrix.
// The entries represent number of pixels.  Items on the diagonal represent correct 
// classification.  Items off the diagonal are misclassifications, where the class in 
// row i is classified as column j.  It's also possible to get basic descriptive 
// statistics from the confusion matrix.  For example:


print('Confusion matrix:', confusionMatrix);
print('Overall Accuracy:', confusionMatrix.accuracy());
print('Kappa: ', confusionMatrix.kappa());


/*
// Set and export the accuracy parameters from the confusion matrix to CSV files
// Confusion matrix
Export.table.toDrive({
  collection: ee.FeatureCollection([
      ee.Feature(null, {matrix: confusionMatrix.array()})
  ]), 
  description: 'Confision_matrix_'+criteria+'_'+year, 
  folder: 'GEE data',
  fileFormat: 'CSV',
});

// Kappa
Export.table.toDrive({
  collection: ee.FeatureCollection([
    ee.Feature(null, {matrix: confusionMatrix.kappa()})
  ]), 
  description: 'Kappa_'+criteria+'_'+year, 
  folder: 'GEE data',
  fileFormat: 'CSV',
});

// Overall Accuracy
Export.table.toDrive({
  collection: ee.FeatureCollection([
    ee.Feature(null, {matrix: confusionMatrix.accuracy()})
  ]), 
  description: 'Accuracy_'+criteria+'_'+year, 
  folder: 'GEE data',
  fileFormat: 'CSV',
});
*/


  
// Colorize the classified image and download it, plus RGB satellite composite image.

// Four-class palette
var palette_classified = [
  '1f8c66', // (1) Salix
  'abca43', // (2) Marshy vegetation
  'ece4b7', // (3) Shells
  '7b3d6c'  // (4) Takyr

];


// Display the classification result and the input image.
Map.addLayer(classified, {min: 1, max: num_of_classes, 
                          palette: palette_classified},
                          'Image Classification');



// Export classificatin results to Google Drive

 Export.image.toDrive({
  image: classified,
  description: name_area+'_classified',
  folder: 'GEE data',
  scale: 10,
  region: AOI,
  crs: 'EPSG:4326',
  maxPixels: 1e10,
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: true
  }
});

// Export classification results to Assets
Export.image.toAsset({
  image: classified,
  description: name_area+'_classified',
  assetId: 'Kakhovka/Kakhovka_classified_Oct_4classes',
  region: AOI,
  scale: 10,
  crs: 'EPSG:4326',
  maxPixels: 1e10
});


// Median raster of Sentinel L2A for the given Area of Interest and for date range
// Delete .select('bands') part if you want full SL2 imagery

Export.image.toDrive({
  image: med.select(['B2', 'B3', 'B4']).clip(AOI),
  description: name_area+'_SL2_SR',
  folder: 'GEE data',
  scale: 10,
  region: AOI,
  crs: 'EPSG:4326',
  maxPixels: 1e10,
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: true
  }
});


// // Export hand-drawn geometries to the Drive, as a Shapefile
// var fc = ee.FeatureCollection(geometry);

// Export.table.toDrive({
//   collection:fc,
//   description: 'kakhovka_water_poly',
//   folder: "GEE data",
//   fileFormat: 'SHP'
// });


// CALCULATE AREAS //

// THE RESERVIOR THEMSELVES //

// Area of the reservior, square km
var areaImage = watermask.selfMask().multiply(ee.Image.pixelArea());

var reserviorArea = AOI.geometry().area()
var reserviorAreaSqKm = ee.Number(reserviorArea).divide(1e6).round()
print('Area of the Reservior (in sq.km)', reserviorAreaSqKm)



// WATER SURFACE//

//Calculate the pixel area in square kilometer
var area_water = watermask
                  .select('b1') //Select the class from the classified image
                  .eq(1) // Define numerical calss value
                  .multiply(ee.Image.pixelArea()) // create new variable with pixels' areas
                  .divide(1000*1000) // transform sq. meters to sq. km
                  // Reducing the statistics for your study area
                  .reduceRegion ({
  reducer: ee.Reducer.sum(),
  geometry: AOI,
  scale: 10,
  maxPixels: 1e10
});

//Get the summed area of water in sq.km
print ('Water Area (in sq.km)', area_water);


// AREAS OF EACH CLASS //

// A loop for calculating areas for classified images
for(var a = 1; a < 5; a++){
  
  var x = classified.eq(a).multiply(ee.Image.pixelArea())
  
  var calculation = x.reduceRegion({
    
    reducer: ee.Reducer.sum(),
    geometry: AOI,
    scale: 10,
    // crs: 'EPSG:4326',
    maxPixels: 1e13,
    
  })
  
  print('class ' + a + ' ' + 'km2',
  calculation,
  ee.Number(calculation.values().get(0)).divide(1e6))
}

