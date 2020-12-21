import typescript from 'rollup-plugin-typescript';
import common from 'rollup-plugin-commonjs'
import less from 'rollup-plugin-less';

export default {
    input: './src/main.ts',
    output: [
        {
            file: './dist/bundle.js',
            format: 'cjs'
        },
    ],
    plugins: [
        common(),
        typescript(),
        less()
    ]
}