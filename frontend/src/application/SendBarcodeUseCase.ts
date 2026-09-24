import type { IBarcodeApiRepository, SendBarcodeResult } from '../domain/ports/IBarcodeApiRepository.js';

export class SendBarcodeUseCase {
  private apiRepository: IBarcodeApiRepository;

  constructor(apiRepository: IBarcodeApiRepository) {
    this.apiRepository = apiRepository;
  }

  public async execute(code: string, format: string = 'UNKNOWN'): Promise<SendBarcodeResult> {
    const trimmed = code.trim();
    if (!trimmed) {
      throw new Error('El código no puede estar vacío');
    }

    return await this.apiRepository.sendBarcode(trimmed, format);
  }
}