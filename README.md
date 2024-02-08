# Plant cover of the former Kakhovka Reservoir
Data and code for reproducing the results of the paper "Reach the bottom: plant cover of the former Kakhovka Reservoir after four months of blowing up the dam".

![Habitats of the former Kakhovka reservoir]()

## Botanical data

## Vegetation and water cover

| Filename | Description | Format |
|----------|-------------|--------|
| kakhovka_voda_ag.shp | Water surface as of 2023-06-05, prior dam breach | Esri Shapefile |
| KAKH_WATER_0620.tif | Water surface as of 2023-06-06 | Geotiff |
| KAKH_WATER_0819.tif | Water surface as of 2023-08-19 | Geotiff |
| KAKH_WATER_1107.tif | Water surface as of 2023-11-07 | Geotiff |
| kakh_ndvi2_0620.tif | Vegetation cover as of 2023-06-06 | Geotiff |
| kakh_ndvi2_0819.tif | Vegetation cover as of 2023-08-19 | Geotiff |
| kakh_ndvi2_1107.tif | Vegetation cover as of 2023-11-07 | Geotiff |

Класи растрових файлів рослинності ложа Каховського водосховища kakh_ndvi2_ХХХХ.tif
1 - Розріджена рослинність
2 - Зімкнута рослинність


## Habitat mapping
Script SL2_image_classification_Kakhovka.js contains the JavaScript code for Google Earth Engine, containing satellite image preparation, supervised classification and its evaluation, calculation of the areas of land cover (habitat) classes, and exporting results. All data required to run this code are already in the form of readable GEE assets and included in the script.
