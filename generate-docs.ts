import fs from 'fs';
import path from 'path';
import * as TagWebSchemas from './src/schemas/tag/tag.web';
import * as TagAdminSchemas from './src/schemas/tag/tag.admin';
import * as ArticleWebSchemas from './src/schemas/article/article.web';
import * as ArticleAdminSchemas from './src/schemas/article/article.admin';
import * as CategoryWebSchemas from './src/schemas/category/category.web';
import * as CategoryAdminSchemas from './src/schemas/category/category.admin';
import * as AlbumWebSchemas from './src/schemas/album/album.web';
import * as AlbumAdminSchemas from './src/schemas/album/album.admin';
import * as CommentWebSchemas from './src/schemas/comment/comment.web.schema';
import * as AuthWebSchemas from './src/schemas/auth/auth.web';
import * as AnnounceWebSchemas from './src/schemas/announce/announce.web';
import * as AnnounceAdminSchemas from './src/schemas/announce/announce.admin';
import * as UserAdminSchemas from './src/schemas/user/user.admin';

// Combine all schemas into a registry
const allSchemas = {
  ...TagWebSchemas,
  ...TagAdminSchemas,
  ...ArticleWebSchemas,
  ...ArticleAdminSchemas,
  ...CategoryWebSchemas,
  ...CategoryAdminSchemas,
  ...AlbumWebSchemas,
  ...AlbumAdminSchemas,
  ...CommentWebSchemas,
  ...AuthWebSchemas,
  ...AnnounceWebSchemas,
  ...AnnounceAdminSchemas,
  ...UserAdminSchemas
};

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

function getZodTypeInfo(schema: any): { type: string, description: string, isRequired: boolean, defaultValue: any } {
    let type = 'any';
    let description = schema.description || '';
    let isRequired = true;
    let defaultValue = undefined;
    
    let current = schema;
    while (current) {
        if (!current._def) break;
        const def = current._def;
        const defType = def.type;
        
        if (defType === 'optional' || defType === 'nullable') {
            isRequired = false;
            current = def.innerType;
        } else if (defType === 'default') {
            isRequired = false;
            defaultValue = typeof def.defaultValue === 'function' ? def.defaultValue() : def.defaultValue;
            current = def.innerType;
        } else if (defType === 'transform') {
            current = def.schema;
        } else if (defType === 'pipe') {
            current = def.in;
        } else if (defType === 'union') {
            type = def.options.map((opt: any) => getZodTypeInfo(opt).type).join(' | ');
            break;
        } else if (defType === 'array') {
            type = getZodTypeInfo(def.element).type + '[]';
            break;
        } else if (defType === 'object') {
            type = 'object';
            break;
        } else if (defType === 'enum') {
            const keys = def.entries ? Object.keys(def.entries) : (def.values || []);
            type = 'enum(' + keys.map((v: any) => `"${v}"`).join(' | ') + ')';
            break;
        } else if (defType === 'nativeEnum') {
            type = 'enum';
            break;
        } else {
            type = defType;
            break;
        }
    }
    
    if (!description && current && current.description) {
        description = current.description;
    }
    
    return { type, description, isRequired, defaultValue };
}

function extractZodObjectProperties(schema: any): any {
    if (!schema || !schema._def) return null;
    let current = schema;
    let properties: any = {};
    
    while (current) {
        if (!current._def) break;
        const defType = current._def.type;
        if (defType === 'object') {
            const shape = current._def.shape;
            for (const key in shape) {
                properties[key] = getZodTypeInfo(shape[key]);
            }
            return properties;
        } else if (defType === 'optional' || defType === 'nullable' || defType === 'default') {
            current = current._def.innerType;
        } else if (defType === 'transform') {
            current = current._def.schema;
        } else if (defType === 'pipe') {
            current = current._def.in;
        } else {
            break;
        }
    }
    return null;
}

function resolveSchemaProperties(schemaName: string) {
  if (!schemaName) return null;
  const schema = (allSchemas as any)[schemaName];
  if (!schema) return null;
  return extractZodObjectProperties(schema);
}

function formatPropertiesToMarkdown(properties: any) {
  if (!properties || Object.keys(properties).length === 0) return '无';
  
  let result = '| 字段名 | 类型 | 必填 | 描述 | 默认值 |\n';
  result += '| --- | --- | --- | --- | --- |\n';
  
  for (const [key, prop] of Object.entries(properties)) {
    const p: any = prop;
    const defaultVal = p.defaultValue !== undefined ? String(p.defaultValue) : '-';
    result += `| \`${key}\` | ${p.type} | ${p.isRequired ? '是' : '否'} | ${p.description || '-'} | ${defaultVal} |\n`;
  }
  return result;
}

function extractEndpoints(filePath: string, basePath: string) {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf-8');
  
  const regex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`](.*?)['"`]([\s\S]*?)(?=router\.(get|post|put|delete|patch)|export default)/g;
  let match;
  const endpoints = [];

  while ((match = regex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    let routePath = match[2];
    if (routePath === '/') routePath = '';
    const fullPath = `${basePath}${routePath}`;
    
    const routeBlock = match[3];

    let paramsSchemaName = null;
    let querySchemaName = null;
    let bodySchemaName = null;

    const zodMatch = routeBlock.match(/zodValidate\s*\(\s*\{([\s\S]*?)\}\s*\)/);
    if (zodMatch) {
      const zodContent = zodMatch[1];
      const paramsMatch = zodContent.match(/params:\s*([A-Za-z0-9_]+)/);
      const queryMatch = zodContent.match(/query:\s*([A-Za-z0-9_]+)/);
      const bodyMatch = zodContent.match(/body:\s*([A-Za-z0-9_]+)/);
      
      if (paramsMatch) paramsSchemaName = paramsMatch[1];
      if (queryMatch) querySchemaName = queryMatch[1];
      if (bodyMatch) bodySchemaName = bodyMatch[1];
    }

    const beforeStr = content.substring(0, match.index).trimEnd();
    let description = '暂无描述';
    
    const comments = [...beforeStr.matchAll(/\/\*\*([\s\S]*?)\*\//g)];
    const singleLineComments = [...beforeStr.matchAll(/\/\/([^\n]*)/g)];
    
    // Determine the last comment block that is right before the route
    const lastBlock = comments.length > 0 ? comments[comments.length - 1] : null;
    const lastSingle = singleLineComments.length > 0 ? singleLineComments[singleLineComments.length - 1] : null;
    
    // Prefer the block comment if it exists near the end, or single line comment
    let rawComment = '';
    if (lastBlock && (!lastSingle || lastBlock.index! > lastSingle.index!)) {
        rawComment = lastBlock[1];
    } else if (lastSingle) {
        rawComment = lastSingle[1];
    }
    
    if (rawComment) {
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
      description,
      paramsSchemaName,
      querySchemaName,
      bodySchemaName
    });
  }

  return endpoints;
}

let markdown = '# 博客接口详细文档 (API Documentation)\n\n';
markdown += '本文档由系统脚本自动生成，涵盖 Web 前台与 Admin 后台的所有路由接口及其请求参数校验规则（基于 Zod Schema）。\n\n';

markdown += '## 目录\n';
markdown += '- [Web 前台接口](#web-前台接口)\n';
markdown += '- [Admin 后台接口](#admin-后台接口)\n\n';

function appendEndpointsMarkdown(routesList: any[], sectionName: string) {
  markdown += `## ${sectionName}\n\n`;
  routesList.forEach((route: any) => {
    const file = path.join(ROUTES_DIR, route.file);
    const endpoints = extractEndpoints(file, route.path);
    if (endpoints.length > 0) {
      markdown += `### ${route.file}\n\n`;
      
      endpoints.forEach(ep => {
        markdown += `#### \`${ep.method}\` ${ep.path}\n`;
        markdown += `**描述:** ${ep.description}\n\n`;
        
        let hasParams = false;
        
        if (ep.paramsSchemaName) {
          hasParams = true;
          markdown += `**路径参数 (Params):**\n\n`;
          const props = resolveSchemaProperties(ep.paramsSchemaName);
          markdown += formatPropertiesToMarkdown(props) + '\n\n';
        }
        
        if (ep.querySchemaName) {
          hasParams = true;
          markdown += `**查询参数 (Query):**\n\n`;
          const props = resolveSchemaProperties(ep.querySchemaName);
          markdown += formatPropertiesToMarkdown(props) + '\n\n';
        }
        
        if (ep.bodySchemaName) {
          hasParams = true;
          markdown += `**请求体 (Body):**\n\n`;
          const props = resolveSchemaProperties(ep.bodySchemaName);
          markdown += formatPropertiesToMarkdown(props) + '\n\n';
        }
        
        if (!hasParams) {
          markdown += `**请求参数:** 无\n\n`;
        }
        
        markdown += '---\n\n';
      });
    }
  });
}

appendEndpointsMarkdown(webRoutes, 'Web 前台接口');
appendEndpointsMarkdown(adminRoutes, 'Admin 后台接口');

fs.writeFileSync(path.join(__dirname, 'API_DOCS.md'), markdown, 'utf-8');
console.log('API_DOCS.md updated with detailed parameters successfully.');
