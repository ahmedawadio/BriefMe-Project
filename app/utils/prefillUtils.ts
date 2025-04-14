export interface PrefillContent {
  title: string;
  notes: string;
  filePath: string;
}

export const exampleContents: PrefillContent[] = [
  {
    title: 'Alexis de Tocqueville',
    notes: 'A great political philosopher.',
    filePath: '/examples/Alexis de Tocqueville.txt'
  },
  {
    title: 'Machine Learning',
    notes: 'Overview of machine learning',
    filePath: '/examples/Machine Learning.txt'
  },
  {
    title: 'Wallyball',
    notes: 'Best sport ever',
    filePath: '/examples/Wallyball.txt'
  },
  {
    title: 'Les Miserables',
    notes: ' Les Miserables by Victor Hugo',
    filePath: '/examples/Les Miserables.txt'
  }
];

export const fetchExampleContent = async (filePath: string): Promise<File | null> => {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status}`);
    }
    
    const blob = await response.blob();
    const fileName = filePath.split('/').pop() || 'example.txt';
    return new File([blob], fileName, { type: 'text/plain' });
  } catch (error) {
    console.error('Error fetching example file:', error);
    return null;
  }
}; 