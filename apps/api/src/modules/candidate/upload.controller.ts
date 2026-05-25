import {
  Controller,
  Post,
  Body,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CandidateService } from './candidate.service';
import { extractTextFromPdf } from './pdf-parser';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

const uploadDir = process.env.UPLOAD_DIR || './uploads';

function ensureUploadDir() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

function decodeFilename(name: string): string {
  return Buffer.from(name, 'latin1').toString('utf-8');
}

const multerOptions = {
  storage: require('multer').diskStorage({
    destination: (_req: any, _file: any, cb: any) => {
      ensureUploadDir();
      cb(null, uploadDir);
    },
    filename: (_req: any, _file: any, cb: any) => {
      cb(null, `${randomUUID()}.pdf`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    file.originalname = decodeFilename(file.originalname);
    if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
};

@Controller('resumes')
export class UploadController {
  constructor(private readonly candidateService: CandidateService) {}

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 10, multerOptions))
  async upload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('jobId') jobId: string,
  ) {
    if (!jobId) {
      for (const f of files || []) fs.unlinkSync(f.path);
      throw new BadRequestException('jobId is required');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const results: any[] = [];

    for (const file of files) {
      try {
        const fileBuffer = fs.readFileSync(file.path);
        const { text: rawText, pageCount } = await extractTextFromPdf(fileBuffer);

        const candidate = await this.candidateService.createWithRawText({
          jobId,
          fileName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          pageCount,
          rawText,
        });

        results.push({
          candidateId: candidate.id,
          fileName: file.originalname,
          uploadStatus: candidate.uploadStatus,
        });
      } catch (e: any) {
        results.push({
          candidateId: null,
          fileName: file.originalname,
          uploadStatus: 'failed',
          error: e.message,
        });
      }
    }

    return results;
  }
}
