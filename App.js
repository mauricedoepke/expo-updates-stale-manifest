import { Asset } from 'expo-asset';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const BUILD = 'first build';

const picture = require('./assets/picture.png');

export default function App() {
  const [download, setDownload] = useState('downloading…');

  // What an app does before its first render when it waits for a font, a translation file or
  // any other asset (expo-font's loadAsync, expo-asset's useAssets): if this never succeeds,
  // such an app stays blank.
  useEffect(() => {
    Asset.fromModule(picture)
      .downloadAsync()
      .then(
        (asset) => setDownload(`downloadAsync: ${asset.localUri}`),
        (error) => setDownload(`downloadAsync failed: ${error.message}`)
      );
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.build}>{BUILD}</Text>
      <Image source={picture} style={styles.picture} />
      <Text>picture.png in the bundle: {Asset.fromModule(picture).hash}</Text>
      <Text>{download}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  build: {
    fontSize: 24,
  },
  picture: {
    width: 200,
    height: 200,
    borderWidth: 1,
    borderColor: '#ccc',
  },
});
