import fs from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as Lucide from 'lucide-react';
const aliases=JSON.parse(fs.readFileSync('src/design-system/icons.json','utf8'));
const output={};
for(const [alias,name] of Object.entries(aliases)){
  if(!Lucide[name])throw new Error(`Missing Lucide icon: ${name}`);
  output[alias]=renderToStaticMarkup(React.createElement(Lucide[name],{size:'1em',strokeWidth:1.75,'aria-hidden':true}));
}
fs.writeFileSync('src/design-system/icon-markup.json',JSON.stringify(output)+'\n');
