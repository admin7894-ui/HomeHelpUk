const fs = require('fs');
const path = require('path');

const inventory = JSON.parse(fs.readFileSync(path.join(__dirname, 'inventory_dump.json'), 'utf-8'));

let mdContent = `# Step 1: Complete App Image Inventory Report

## Audit Scope & Requirement Metrics

| Category / Slot Type | Quantity | Requirements per Item | Total Unique Asset Slots |
| :--- | :--- | :--- | :--- |
| **Categories** | 17 | 1 Category Cover Image | 17 unique images |
| **Individual Services** | 76 | 1 Service Cover Image | 76 unique images |
| **Service Galleries** | 76 Services | 4 Dedicated Gallery Images | 304 unique images |
| **TOTAL IMAGE ASSET SLOTS REQUIRED** | **76 Services + 17 Categories** | **0 Duplicates Allowed Across App** | **397 Unique Asset Slots** |

---

## Detailed Category & Service Inventory Breakdown

`;

inventory.forEach((cat, idx) => {
  mdContent += `### ${idx + 1}. Category: ${cat.name} (\`${cat.id}\`)\n`;
  mdContent += `- **Category Cover Slot:** 1 image (\`assets/images/categories/${cat.id}.jpg\`)\n`;
  mdContent += `- **Total Services under ${cat.name}:** ${cat.services.length}\n\n`;

  cat.services.forEach((srv) => {
    mdContent += `#### Service: ${srv.name} (\`${srv.id}\`)\n`;
    mdContent += `- **Subcategory:** ${srv.subcategoryName}\n`;
    mdContent += `- **Cover Image Slot:** 1 image (\`assets/images/services/${srv.id}/cover.jpg\`)\n`;
    mdContent += `- **Gallery Image Slots:** 4 dedicated images (\`gallery-1.jpg\`, \`gallery-2.jpg\`, \`gallery-3.jpg\`, \`gallery-4.jpg\`)\n\n`;
  });

  mdContent += `---\n\n`;
});

mdContent += `## STOP CRITICAL REQUIREMENT

> [!IMPORTANT]
> **This Inventory Report completes Step 1 of the request.**
> No image downloading, sourcing, assignment, or code modifications will occur until this full inventory report is reviewed and confirmed by the user.
`;

fs.writeFileSync(path.join(__dirname, 'inventory_report_content.md'), mdContent);
console.log('Generated inventory_report_content.md');
