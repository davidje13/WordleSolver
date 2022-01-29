set -e

BASE_DIR="$(dirname "$0")/../..";
GENFILE="$BASE_DIR/src/generated-data.js";
GENBIN="$BASE_DIR/src/tools/word-loader.js";

echo '// generated file' > "$GENFILE";
echo >> "$GENFILE";

echo "const data = {" >> "$GENFILE";
cat "$BASE_DIR/data/words-allowed.txt" | node "$GENBIN" "allowed" >> "$GENFILE";
cat "$BASE_DIR/data/words-solution.txt" | node "$GENBIN" "solution" >> "$GENFILE";
echo "};" >> "$GENFILE";
