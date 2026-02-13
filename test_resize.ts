import fs from 'fs';
import path from 'path';
import { compressImage } from './src/utils/image.util';

async function test() {
    // 寻找一个存在的图片文件
    const searchDir = '/Users/sakisdk/Desktop/Blog/server-new/public/uploads/articles/images/2026/02/';
    let inputPath = '';
    
    if (fs.existsSync(searchDir)) {
        const files = fs.readdirSync(searchDir);
        const img = files.find(f => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png'));
        if (img) inputPath = path.join(searchDir, img);
    }

    if (!inputPath || !fs.existsSync(inputPath)) {
        console.error('No test image found.');
        return;
    }

    console.log(`Testing with file: ${inputPath}`);
    const buffer = fs.readFileSync(inputPath);
    console.log(`Original Size: ${(buffer.length / 1024).toFixed(2)} KB`);
    
    // Test 1: Standard optimized (Quality 60, Effort 3, Resize 1920)
    // Note: If image is smaller than 1920, it shouldn't upscale if withoutEnlargement is true.
    console.log('\n--- Test 1: Standard Config (Q60, E3, W1920) ---');
    const start1 = Date.now();
    const buf1 = await compressImage(buffer, { 
        format: 'avif', 
        quality: 60, 
        effort: 3, 
        resize: { width: 1920, withoutEnlargement: true } 
    });
    console.log(`Time: ${Date.now() - start1}ms`);
    console.log(`Size: ${(buf1.length / 1024).toFixed(2)} KB`);

    // Test 2: Aggressive Resize (Width 100)
    console.log('\n--- Test 2: Aggressive Resize (W100) ---');
    const start2 = Date.now();
    const buf2 = await compressImage(buffer, { 
        format: 'avif', 
        quality: 60, 
        effort: 3, 
        resize: { width: 100 } 
    });
    console.log(`Time: ${Date.now() - start2}ms`);
    console.log(`Size: ${(buf2.length / 1024).toFixed(2)} KB`);
}

test().catch(console.error);
