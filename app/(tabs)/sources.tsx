import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../src/theme/colors";

export default function SourcesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Sources</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: colors.text,
    fontSize: 18,
  },
});