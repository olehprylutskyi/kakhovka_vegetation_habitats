# Plant cover of the former Kakhovka Reservoir
Data and code for reproducing the results of the paper "Initial stages of revegetation at the bottom of the drained Kakhovka reservoir (Ukraine): synthesis of field surveys and remote sensing" (in press).

![Habitats of the former Kakhovka reservoir, as of October 2023](https://github.com/olehprylutskyi/kakhovka_vegetation_habitats/blob/main/habitat_map_2023.png)

You can aslo view two-period high-resolution map [through the GEE online viewer](https://ee-olegpril12.projects.earthengine.app/view/kakhovka-habitat-map-oct-2023).

## Botanical data
File `Species_list_07_2024.xlsx` contains full list of taxa (species, hybrids, infraspecific taxa), as well as data on occurrence of these taxa during all surveys (2023-06-30, 2023-10-19, and 2024-05-25). Fields Lifespan, Dispersal, Origin indicates respective traits. More details on traits assignment are provided in the Methods section of the manuscript.

Script `traits_alluvial_plot.R` contains R code to reproduce alluvium plot provided in the manuscript.

## Vegetation and water cover

| Filename | Description | Format |
|----------|-------------|--------|
| kakhovka_voda_ag.shp | Water surface as of 2023-06-05, prior dam breach | Esri Shapefile |
| KAKH_WATER_0620.tif | Water surface as of 2023-06-06 | Geotiff |
| KAKH_WATER_0819.tif | Water surface as of 2023-08-19 | Geotiff |
| KAKH_WATER_1107.tif | Water surface as of 2023-11-07 | Geotiff |
| KAKH_WATER_0525.tif | Water surface as of 2024-05-25 | Geotiff |
| kakh_ndvi2_0620.tif | Closed vegetation cover as of 2023-06-06 | Geotiff |
| kakh_ndvi2_0819.tif | Closed vegetation cover as of 2023-08-19 | Geotiff |
| kakh_ndvi2_1107.tif | Closed vegetation cover as of 2023-11-07 | Geotiff |
| ground_truth_2023 | Ground truth polygons for supervised image classification, Oct. 2023 | Esri Shapefile |
| ground_truth_2024 | Ground truth polygons for supervised image classification, May 2024 | Esri Shapefile |

Rasters kakh_ndvi2_ХХХХ.tif contains two classes:

1. Open vegetation
2. Closed vegetation

## Habitat mapping
Scripts `SL2_image_classification_<DATE>.js` provide codes for Google Earth Engine (JavaScript editor), containing satellite image preparation, supervised classification and its evaluation, calculation of the areas of land cover (habitat) classes, and exporting results. All data required to run codes are already in the form of readable GEE assets and included in the script.
