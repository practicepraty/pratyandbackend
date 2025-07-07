import { ContentTemplate } from "../models/website.models.js";
import { DEFAULT_TEMPLATES } from "../config/templates.config.js";

export const seedDefaultTemplates = async () => {
  try {
    console.log("Starting template seeding...");
    
    // Check if templates already exist
    const existingTemplates = await ContentTemplate.countDocuments();
    
    if (existingTemplates > 0) {
      console.log("Templates already exist. Skipping seeding.");
      return;
    }

    // Create templates from configuration
    const templatePromises = Object.entries(DEFAULT_TEMPLATES).map(async ([specialty, templateData]) => {
      const template = new ContentTemplate({
        name: templateData.name,
        specialty: templateData.specialty,
        template: templateData.template,
        isDefault: true,
        createdBy: "system"
      });

      return template.save();
    });

    await Promise.all(templatePromises);
    
    console.log(`✅ Successfully seeded ${Object.keys(DEFAULT_TEMPLATES).length} default templates`);
    
  } catch (error) {
    console.error("❌ Error seeding templates:", error);
    throw error;
  }
};

// Function to update existing templates
export const updateDefaultTemplates = async () => {
  try {
    console.log("Updating default templates...");
    
    const updatePromises = Object.entries(DEFAULT_TEMPLATES).map(async ([specialty, templateData]) => {
      const existingTemplate = await ContentTemplate.findOne({ 
        specialty: templateData.specialty, 
        isDefault: true 
      });

      if (existingTemplate) {
        existingTemplate.template = templateData.template;
        existingTemplate.name = templateData.name;
        return existingTemplate.save();
      } else {
        const newTemplate = new ContentTemplate({
          name: templateData.name,
          specialty: templateData.specialty,
          template: templateData.template,
          isDefault: true,
          createdBy: "system"
        });
        return newTemplate.save();
      }
    });

    await Promise.all(updatePromises);
    
    console.log("✅ Successfully updated default templates");
    
  } catch (error) {
    console.error("❌ Error updating templates:", error);
    throw error;
  }
};

// Function to reset all templates
export const resetTemplates = async () => {
  try {
    console.log("Resetting all templates...");
    
    // Remove all existing templates
    await ContentTemplate.deleteMany({});
    
    // Seed new templates
    await seedDefaultTemplates();
    
    console.log("✅ Successfully reset all templates");
    
  } catch (error) {
    console.error("❌ Error resetting templates:", error);
    throw error;
  }
};