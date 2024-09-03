# Reser R's brain
rm(list = ls())

# Set working directory
setwd("~/Documents_GIS/Kakhovka/rasters_operations")

library(dplyr)      # data manipulations
library(tidyr)      # data manipulations
library(openxlsx2)  # read data from *.xlsx files
library(ggplot2)    # data visualization
library(ggalluvial) # apply ggplot graphics for allivium plots
library(ggfittext)  # Labelling strata

plants <- wb_read(file = "Species_list_07_2024.xlsx", sheet = 2) %>% 
  select(
    `Species name (final)`, 
    `Life span (FloraVeg.EU)`, 
    Dispersal, 
    `Origin (in Europe)`
  ) %>% 
  rename(
    Species = 1,
    Lifespan = 2,
    Origin = 4
  ) %>% 
  na.omit() %>% 
  mutate_all(as.factor) %>% 
  count(Lifespan, Dispersal, Origin) %>% 
  # Rename some categories and set factor levels for Dispersal
  mutate(Dispersal = recode(Dispersal,
                            # "Anemochory," = "Anemochory",
                            " Local non-specific dispersal" = "Local non-specific dispersal",
                            # "Anemochory, Anthropochory" = "Anemochory",
                            # "Endozoochory, Anthropochory" = "Endozoochory",
                            # "Epizoochory, Anthropochory" = "Epizoochory",
                            # "Local non-specific dispersal, Anthropochory" = "Local non-specific dispersal",
                            # "Myrmecochory, Anthropochory" = "Myrmecochory"
                            )
                          ) %>% 
  filter(Dispersal != "N/A") %>% 
  mutate(Dispersal = factor(Dispersal,
                            levels = c("Anemochory",
                                       "Local non-specific dispersal",
                                       "Myrmecochory",
                                       "Epizoochory",
                                       "Endozoochory",
                                       "Hydrochory"
                                       )
                            )
         ) %>% 
  # Fix issues with category names and reorder Lifespan
  mutate(
    Lifespan = recode(
      Lifespan,
      "Biennial or short-lived" = "Short-lived"
    )
  ) %>% 
  mutate(Lifespan = factor(Lifespan,
                           levels = c("Annual",
                                      "Short-lived",
                                      "Perennial herbal",
                                      "Perennial woody")
                           )
         )

# Check categories in Dispersal and Lifespan
levels(plants$Dispersal)
levels(plants$Lifespan)


# Plot allivium for 2024 y
plants %>% 
  ggplot(aes(y = n,              # Height of Y-axis
             axis1 = Lifespan,   # First variable on the X-axis
             axis2 = Dispersal,  # Second variable on the X-axis
             axis3 = Origin)     # Third variable on the X-axis
         ) +
  geom_alluvium(aes(fill = Lifespan),
                curve_type = "cubic",
                # curve_type = "quintic",
                # curve_type = "sine",
                # curve_type = "arctangent",
                # curve_type = "sigmoid",
                aes.bind = TRUE, width = 1/2) +
  scale_x_discrete(limits = c("Life span", "Dispersal", "Origin"), 
                   expand = c(.2, .05)
                   ) +
  labs(x = "Traits", y = "Number of Species") +
  geom_stratum(width = 1/2, alpha = 0) +
  # geom_text(stat = "stratum", aes(label = after_stat(stratum))) +
  ggfittext::geom_fit_text(stat = "stratum", 
                           aes(label = after_stat(stratum)),
                           width = 1/2, min.size = 4,
                           reflow = TRUE) +
  theme_minimal() +
  theme(legend.position = "none",
        panel.grid = element_blank(),
        axis.text.y = element_blank()) -> p

p

# Save as *.png
png("traits_alluvial_2024.png", width = 16, height = 12, units = "cm", res = 300)
p
dev.off()

# Save as *.svg
library(svglite)
ggsave("traits_alluvial_2024.svg", bg = "white", width = 6.29921, height = 4.72441)

