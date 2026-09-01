<div align="center">

# Ali Ahmadi — Academic & Research Portfolio

An interactive academic portfolio presenting research, teaching, systems expertise, selected projects, achievements, GitHub activity, and professional references.

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=111)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![GitHub Pages](https://img.shields.io/badge/Hosted%20with-GitHub%20Pages-222?style=flat-square&logo=github)](https://pages.github.com/)

**[Live website](https://aliahmadi-software.github.io/)** · **[GitHub profile](https://github.com/AliAhmadi-Software)** · **[Email](mailto:aliahmadi79sh@gmail.com)**

</div>

## Overview

This repository contains the source for Ali Ahmadi's personal academic website. It is a fully static, responsive portfolio built without a framework or build step, making it straightforward to maintain and deploy with GitHub Pages.

The visual system combines an editorial serif typeface for prominent headings with a readable sans-serif typeface for supporting content. The default dark theme, optional light mode, subtle motion, responsive layouts, and accessible controls create a focused presentation across desktop and mobile devices.

## Highlights

- Animated hero identity and realistic typewriter specialties
- Responsive sticky navigation with desktop and mobile modes
- Research works, academic journey, teaching experience, and achievements
- Technical toolkit with categorized skill icons
- Live GitHub profile statistics and contribution activity
- Interactive terminal and research map
- Local evidence-backed “Ask Ali” demonstration page
- Academic references with email and Google Scholar links
- Dark/light theme support
- Reduced-motion support and semantic accessibility labels
- No framework, package manager, or compilation step required

## Technology

| Area | Implementation |
| --- | --- |
| Markup | Semantic HTML5 |
| Styling | CSS custom properties, Grid, Flexbox, responsive media queries, animations |
| Interaction | Vanilla JavaScript (ES6+) |
| Typography | Georgia / Times New Roman and Inter via Google Fonts |
| Live profile data | GitHub REST API |
| Contribution calendar | `github-contributions-api.jogruber.de` |
| Skill artwork | [Skill Icons](https://skillicons.dev/) |
| Hosting | GitHub Pages |

## Project Structure

```text
.
├── index.html              # Main portfolio page
├── ask.html                # Ask Ali demonstration page
├── styles.css              # Complete visual system and responsive styles
├── app.js                  # Interactions, themes, live data, and UI behavior
├── README.md               # Project documentation
└── assets/
    ├── Ali_Ahmadi_CV.pdf   # Downloadable CV
    ├── ali-main.jpg        # Main portrait
    ├── ali-avatar.jpg      # Compact profile image
    ├── favicon.svg         # Static favicon
    ├── tab/                # Animated tab artwork
    └── ...                 # Academic and supporting imagery
```

In the GitHub repository:

1. Open **Settings**.
2. Select **Pages** under **Code and automation**.
3. Set **Source** to **Deploy from a branch**.
4. Select the `main` branch and the `/(root)` folder.
5. Select **Save** and wait for the deployment to finish.

The site will be available at:

```text
https://aliahmadi-software.github.io/
```

## External Data and Graceful Fallbacks

The GitHub activity section requests public data at runtime. Rate limits, privacy tools, network restrictions, or temporary API availability can prevent live data from loading. The interface includes a fallback state and a direct link to the GitHub profile when this happens.

## Contact

- Email: [aliahmadi79sh@gmail.com](mailto:aliahmadi79sh@gmail.com)
- GitHub: [AliAhmadi-Software](https://github.com/AliAhmadi-Software)
- LinkedIn: [Ali Ahmadi](https://www.linkedin.com/in/ali-ahmadi-79ah/)

---

<div align="center">
  Built as a focused academic profile for research, systems, and teaching.
</div>
