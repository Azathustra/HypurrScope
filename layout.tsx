@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
  background: #041814;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(67, 255, 213, 0.16), transparent 38rem),
    radial-gradient(circle at top right, rgba(255, 209, 102, 0.10), transparent 32rem),
    linear-gradient(135deg, #02120f 0%, #041d18 48%, #02110f 100%);
  color: white;
}

button, input {
  font: inherit;
}

::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: rgba(255,255,255,0.03);
}

::-webkit-scrollbar-thumb {
  background: rgba(103, 232, 249, 0.28);
  border-radius: 999px;
}

::selection {
  background: rgba(125, 249, 255, 0.28);
}
