# Reser R's brain
rm(list = ls())

# Set working directory
setwd("~/git/kakhovka_vegetation_habitats")

library(dplyr)        # data manipulation
library(tidyr)        # data manipulation
library(ggplot2).     # visualization
library(ggalluvial)   # alluvial graphic
library(ggfittext)    # Labelling strata in alluvial plots

# Read data from local *.csv file
plants <- read.csv("checklist_traits.csv") %>% 
  drop_na() %>% 
  mutate_all(as.factor)

# Drop one species with unknown Dispersal
plants %>% 
  filter(Dispersal != "") -> plants

# Check Dispersal levels
plants %>% count(Dispersal)

# Check Life span levels
plants %>% 
  count(Lifespan)

# Check Origin levels
plants %>% 
  count(Origin)  
  
# Count species within each combination of traits
plants %>% 
  count(Lifespan, Dispersal, Origin) -> plants


# Set factor levels for Dispersal
plants %>% 
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
  mutate(Lifespan = factor(Lifespan,
                           levels = c("Annual",
                                      "Short-lived",
                                      "Perennial herbal",
                                      "Perennial woody")
                           )
         ) -> plants

levels(plants$Dispersal)


# Construct plot
plants %>% 
  ggplot(aes(y = n,               # Height of Y-axis
             axis1 = Lifespan,    # First variable on the X-axis
             axis2 = Dispersal,   # Second variable on the X-axis
             axis3 = Origin)      # Third variable on the X-axis
         ) +
  geom_alluvium(aes(fill = Lifespan),
                curve_type = "cubic",
                aes.bind = TRUE, width = 1/2) +
  scale_x_discrete(limits = c("Life span", "Dispersal", "Origin"), 
                   expand = c(.2, .05)
                   ) +
  labs(x = "Traits", y = "Number of Species") +
  geom_stratum(width = 1/2, alpha = 0) +
  ggfittext::geom_fit_text(stat = "stratum", 
                           aes(label = after_stat(stratum)),
                           width = 1/2, min.size = 4,
                           reflow = TRUE) +
  theme_minimal() +
  theme(legend.position = "none",
        panel.grid = element_blank(),
        axis.text.y = element_blank()) -> p

# Preview plot
p

# Save as *.png
png("traits_alluvial.png", width = 16, height = 12, units = "cm", res = 300)
p
dev.off()

# Save as *.svg
library(svglite)
ggsave("traits_alluvial.svg", bg = "white", width = 6.29921, height = 4.72441)

