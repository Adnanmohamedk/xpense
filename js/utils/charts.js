/**
 * Custom SVG Pie Chart Generator
 */
export const renderPieChart = (containerId, data) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const width = 200;
    const height = 200;
    const radius = 80;
    const centerX = width / 2;
    const centerY = height / 2;

    const total = data.reduce((acc, curr) => acc + curr.value, 0);
    if (total === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.875rem;">No data to display</p>';
        return;
    }

    let cumulativeAngle = 0;
    let svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

    data.forEach((slice, index) => {
        const sliceAngle = (slice.value / total) * 2 * Math.PI;
        const x1 = centerX + radius * Math.cos(cumulativeAngle);
        const y1 = centerY + radius * Math.sin(cumulativeAngle);
        const x2 = centerX + radius * Math.cos(cumulativeAngle + sliceAngle);
        const y2 = centerY + radius * Math.sin(cumulativeAngle + sliceAngle);

        const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

        const pathData = `
      M ${centerX} ${centerY}
      L ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
      Z
    `;

        svgContent += `
      <path d="${pathData}" fill="${slice.color}" stroke="var(--card-bg)" stroke-width="2">
        <title>${slice.label}: ${slice.value}</title>
      </path>
    `;

        cumulativeAngle += sliceAngle;
    });

    // Add inner circle for donut chart effect
    svgContent += `<circle cx="${centerX}" cy="${centerY}" r="${radius * 0.6}" fill="var(--card-bg)" />`;

    // Add total in the middle
    svgContent += `
    <text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="middle" fill="var(--text-primary)" style="font-weight: 700; font-size: 0.875rem;">
      TOTAL
    </text>
  `;

    svgContent += '</svg>';
    container.innerHTML = svgContent;
};
