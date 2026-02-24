export async function readTextFile(file: File): Promise<string> {
  if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
    throw new Error('Invalid file type. Only .txt files are supported.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    
    reader.readAsText(file);
  });
}
