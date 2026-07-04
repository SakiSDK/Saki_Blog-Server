const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, 'src/routes');

const webRoutes = [
  { path: '/api/v1/web/auth', file: 'web/auth.router.ts' },
  { path: '/api/v1/web/album', file: 'web/album.router.ts' },
  { path: '/api/v1/web/category', file: 'web/category.router.ts' },
  { path: '/api/v1/web/tag', file: 'web/tag.router.ts' },
  { path: '/api/v1/web/article', file: 'web/article.router.ts' },
  { path: '/api/v1/web/announce', file: 'web/announce.router.ts' }
];

const adminRoutes = [
  { path: '/api/v1/admin/auth', file: 'admin/auth.router.ts' },
  { path: '/api/v1/admin/tag', file: 'admin/tag.router.ts' },
  { path: '/api/v1/admin/category', file: 'admin/category.router.ts' },
  { path: '/api/v1/admin/upload', file: 'admin/upload.router.ts' },
  { path: '/api/v1/admin/article', file: 'admin/article.router.ts' },
  { path: '/api/v1/admin/album', file: 'admin/album.router.ts' },
  { path: '/api/v1/admin/announce', file: 'admin/announce.router.ts' }
];

function extractEndpoints(filePath, basePath) {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf-8');
  const regex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`](.*?)['"`]/g;
  let match;
  const endpoints = [];

  while ((match = regex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    let routePath = match[2];
    if (routePath === '/') routePath = '';
    const fullPath = `${basePath}${routePath}`;

    const beforeStr = content.substring(0, match.index).trimEnd();
    let description = '暂无描述';
    
    // Find the last comment block
    const commentMatch = beforeStr.match(/(?:\/\*\*([\s\S]*?)\*\/|\/\/([^\n]*))$/);
    if (commentMatch) {
      let rawComment = commentMatch[1] || commentMatch[2];
      
      // Clean up the comment
      let lines = rawComment.split('\n')
        .map(l => l.replace(/^\s*\*\s?/, '').trim())
        .filter(l => l && !l.startsWith('@route'));
        
      let descLine = lines.find(l => l.startsWith('@description:')) || lines[0];
      if (descLine) {
         description = descLine.replace('@description:', '').trim() || description;
      }
    }

    endpoints.push({
      method,
      path: fullPath,
      description
    });
  }

  return endpoints;
}

let markdown = '# 博客接口文档 (API Documentation)\n\n';
markdown += '本文档由系统脚本自动生成，涵盖 Web 前台与 Admin 后台的所有路由接口。\n\n';

markdown += '## 目录\n';
markdown += '- [Web 前台接口](#web-前台接口)\n';
markdown += '- [Admin 后台接口](#admin-后台接口)\n\n';

markdown += '## Web 前台接口\n\n';
webRoutes.forEach(route => {
  const file = path.join(ROUTES_DIR, route.file);
  const endpoints = extractEndpoints(file, route.path);
  if (endpoints.length > 0) {
    markdown += `### ${route.file}\n\n`;
    markdown += '| 请求方法 | 接口路径 | 接口描述 |\n';
    markdown += '| --- | --- | --- |\n';
    endpoints.forEach(ep => {
      markdown += `| \`${ep.method}\` | \`${ep.path}\` | ${ep.description} |\n`;
    });
    markdown += '\n';
  }
});

markdown += '## Admin 后台接口\n\n';
adminRoutes.forEach(route => {
  const file = path.join(ROUTES_DIR, route.file);
  const endpoints = extractEndpoints(file, route.path);
  if (endpoints.length > 0) {
    markdown += `### ${route.file}\n\n`;
    markdown += '| 请求方法 | 接口路径 | 接口描述 |\n';
    markdown += '| --- | --- | --- |\n';
    endpoints.forEach(ep => {
      markdown += `| \`${ep.method}\` | \`${ep.path}\` | ${ep.description} |\n`;
    });
    markdown += '\n';
  }
});

fs.writeFileSync(path.join(__dirname, 'API_DOCS.md'), markdown, 'utf-8');
console.log('API_DOCS.md updated successfully.');
