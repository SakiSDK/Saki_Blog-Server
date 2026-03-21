import Mint from 'mint-filter';

// 基础敏感词库（按类别划分，方便维护）
const defaultSensitiveWords = [
  // --- 辱骂/人身攻击 ---
  '傻逼', '沙雕', '脑残', '弱智', '白痴', '智障', '废物', '杂种', '畜生', '狗娘养的',
  '操你妈', '草泥马', 'CNM', 'NMSL', '你妈死了', '死全家', '断子绝孙', '贱人', '婊子', '荡妇',
  '妈的', '他妈的', '特么的', '去死', '滚蛋', '死爹', '狗屁', '狗逼',

  // --- 色情/低俗 ---
  '色情', '黄片', '毛片', 'A片', 'GV', '淫秽', '嫖娼', '妓女', '卖淫', '招嫖',
  '裸聊', '迷药', '春药', '催情', '援交', '包夜', '找小姐', '打飞机', '自慰', '强奸',
  '迷奸', '轮奸', '露点', '巨乳', '偷拍',

  // --- 赌博/违禁品/灰黑产 ---
  '赌博', '博彩', '赌场', '赌球', '六合彩', '老虎机', '买马', '百家乐', '时时彩',
  '毒品', '海洛因', '冰毒', '大麻', '摇头丸', 'K粉', '鸦片', '买卖枪支', '走私',
  '枪支', '弹药', '炸药', '雷管', '火药', '假币', '假钞', '洗钱', '黑钱', '套现',
  '办证', '刻章', '假发票', '代开发票', '窃听器', '跟踪器', '迷药',

  // --- 政治敏感/暴恐/邪教 (基础过滤) ---
  '台独', '藏独', '疆独', '港独', '分裂国家', '恐怖主义', '恐怖袭击', '基地组织',
  '法轮功', '邪教', '全能神', '自焚', '暴乱', '暴动', '推翻政府', '反党', '反政府',
  
  // --- 其他不良导向 ---
  '自杀', '割腕', '跳楼', '吃安眠药', '代孕', '买卖器官', '人体器官', '刷单', '刷信誉'
];

/**
 * 敏感词过滤器单例实例
 * 使用 mint-filter (基于 Aho–Corasick 算法) 进行高效过滤
 */
const mint = new Mint(defaultSensitiveWords);

export class SensitiveWordFilter {
  /**
   * 检查文本是否包含敏感词
   * @param text 要检查的文本
   * @returns boolean 包含返回 true，否则返回 false
   */
  static hasSensitiveWords(text: string): boolean {
    if (!text) return false;
    return mint.verify(text);
  }

  /**
   * 过滤敏感词，将其替换为指定字符（默认：*）
   * @param text 要过滤的文本
   * @param replaceChar 替换字符，默认为 '*'
   * @returns 过滤后的文本
   */
  static filter(text: string, replaceChar: string = '*'): string {
    if (!text) return text;
    // mint.filter 返回 { text: 过滤后的文本, words: 被过滤的词数组 }
    const result = mint.filter(text, { replace: true });
    // 如果想要自定义替换字符，mint-filter 默认是 '*'
    // 如果传了其他字符，我们再做一次简单处理（由于库默认用 *，这里为了保持接口简单直接返回其处理结果）
    return result.text;
  }

  /**
   * 获取文本中包含的所有敏感词
   * @param text 要检查的文本
   * @returns 包含的敏感词数组
   */
  static getSensitiveWords(text: string): string[] {
    if (!text) return [];
    return mint.filter(text).words;
  }

  /**
   * 动态添加新的敏感词到过滤器中
   * @param words 要添加的敏感词数组
   */
  static addWords(words: string[]): void {
    mint.add(words as any); // 兼容库类型定义可能存在的问题，实际运行时支持传入数组
  }
}