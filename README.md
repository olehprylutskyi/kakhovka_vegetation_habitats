# Plant cover of the former Kakhovka Reservoir
Data and code for reproducing the results of the paper "Reach the bottom: plant cover of the former Kakhovka Reservoir after four months of blowing up the dam".

![Habitats of the former Kakhovka reservoir](https://github.com/olehprylutskyi/kakhovka_vegetation_habitats/blob/main/habitat_map.png)

You can aslo view high-resolution map [online](https://ee-olegpril12.projects.earthengine.app/view/kakhovka-habitat-map-oct-2023).

## Botanical data
File `checklist_traits.csv` contains full list of taxa (species, hybrids, infraspecific taxa), as well as data on occurrence of these taxa during both surveys (2023-06-30, 2023-10-19). Fields Lifespan, Dispersal, Origin indicates respective traits. More details on traits assignment are provided in the Methods section of the manuscript.

Script `traits_alluvial_plot.R` contains R code to reproduce alluvial plot provided in the manuscript.

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
| trainings_poly_woWater.shp | Ground truth polygons for supervised image classification | Esri Shapefile |

Rasters kakh_ndvi2_ХХХХ.tif contains two classes:

1. Open vegetation
2. Closed vegetation

## Habitat mapping
Script `SL2_image_classification_Kakhovka.js` contains the JavaScript code for Google Earth Engine, containing satellite image preparation, supervised classification and its evaluation, calculation of the areas of land cover (habitat) classes, and exporting results. All data required to run this code are already in the form of readable GEE assets and included in the script.
