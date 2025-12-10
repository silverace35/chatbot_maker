/**
 * Service for chunking text into smaller segments for embedding
 */

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

export interface TextChunk {
  content: string;
  index: number;
  metadata?: Record<string, any>;
}

class ChunkingService {
  private readonly defaultChunkSize = 500;
  private readonly defaultChunkOverlap = 50;
  private readonly defaultSeparators = ['\n\n', '\n', '. ', ' '];

  /**
   * Split text into chunks with overlap
   */
  chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
    const chunkSize = options.chunkSize || this.defaultChunkSize;
    const chunkOverlap = options.chunkOverlap || this.defaultChunkOverlap;
    const separators = options.separators || this.defaultSeparators;

    if (!text || text.length === 0) {
      return [];
    }

    // If text is shorter than chunk size, return as single chunk
    if (text.length <= chunkSize) {
      return [{
        content: text,
        index: 0,
        metadata: { originalLength: text.length }
      }];
    }

    const chunks: TextChunk[] = [];
    let startIdx = 0;
    let chunkIndex = 0;

    while (startIdx < text.length) {
      let endIdx = Math.min(startIdx + chunkSize, text.length);

      // If not at the end, try to find a good breaking point
      if (endIdx < text.length) {
        let bestBreakPoint = -1;

        // Try each separator in order
        for (const separator of separators) {
          const searchStart = Math.max(startIdx, endIdx - 100); // Look back up to 100 chars
          const lastIndex = text.lastIndexOf(separator, endIdx);

          if (lastIndex > searchStart) {
            bestBreakPoint = lastIndex + separator.length;
            break;
          }
        }

        // Use the break point if found, otherwise use hard cutoff
        if (bestBreakPoint > startIdx) {
          endIdx = bestBreakPoint;
        }
      }

      const chunkContent = text.substring(startIdx, endIdx).trim();

      if (chunkContent.length > 0) {
        chunks.push({
          content: chunkContent,
          index: chunkIndex,
          metadata: {
            startChar: startIdx,
            endChar: endIdx,
            length: chunkContent.length
          }
        });
        chunkIndex++;
      }

      // Move start index forward with overlap
      startIdx = endIdx - chunkOverlap;

      // Prevent infinite loop
      if (startIdx <= chunks[chunks.length - 1]?.metadata?.startChar) {
        startIdx = endIdx;
      }
    }

    return chunks;
  }

  /**
   * Extract text from file content based on mime type
   */
  extractText(content: string | Buffer, mimeType: string): string {
    // For MVP, we only support plain text files
    // Future: add PDF, DOCX, etc. parsers
    
    if (mimeType.startsWith('text/')) {
      return content.toString('utf-8');
    }

    if (mimeType === 'application/json') {
      try {
        return JSON.stringify(JSON.parse(content.toString('utf-8')), null, 2);
      } catch {
        return content.toString('utf-8');
      }
    }

    // Default: try to parse as text
    return content.toString('utf-8');
  }

  /**
   * Clean and normalize text
   */
  cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\t/g, '  ') // Replace tabs with spaces
      .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
      .trim();
  }
}

export const chunkingService = new ChunkingService();
