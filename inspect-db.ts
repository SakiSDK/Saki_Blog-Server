import fs from 'fs';
import { sequelize } from './src/models/sequelize';
import { Comment } from './src/models';

async function run() {
  await sequelize.authenticate();
  const comments = await Comment.findAll({ raw: true });
  fs.writeFileSync('db-comments.json', JSON.stringify(comments.map(c => ({ id: c.id, parentId: c.parentId, content: c.content })), null, 2));
  process.exit(0);
}
run().catch(console.error);
