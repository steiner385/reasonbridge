// vitest.config.ts
import { defineConfig } from "file:///mnt/ssk-ssd/tony/GitHub/uniteDiscord/node_modules/.pnpm/vitest@2.1.9_@types+node@20.17.12_@vitest+ui@2.1.9_jsdom@27.4.0/node_modules/vitest/dist/config.js";
import react from "file:///mnt/ssk-ssd/tony/GitHub/uniteDiscord/node_modules/.pnpm/@vitejs+plugin-react@4.7.0_vite@6.4.1_@types+node@20.17.12_jiti@1.21.7_tsx@4.21.0_yaml@2.8.2_/node_modules/@vitejs/plugin-react/dist/index.js";
var vitest_config_default = defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "../coverage/frontend"
    },
    reporters: ["default", "junit"],
    outputFile: {
      junit: "../coverage/junit.xml"
    }
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9tbnQvc3NrLXNzZC90b255L0dpdEh1Yi91bml0ZURpc2NvcmQvZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9tbnQvc3NrLXNzZC90b255L0dpdEh1Yi91bml0ZURpc2NvcmQvZnJvbnRlbmQvdml0ZXN0LmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vbW50L3Nzay1zc2QvdG9ueS9HaXRIdWIvdW5pdGVEaXNjb3JkL2Zyb250ZW5kL3ZpdGVzdC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlc3QvY29uZmlnJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgdGVzdDoge1xuICAgIGdsb2JhbHM6IHRydWUsXG4gICAgZW52aXJvbm1lbnQ6ICdqc2RvbScsXG4gICAgc2V0dXBGaWxlczogWycuL3NyYy9zZXR1cFRlc3RzLnRzJ10sXG4gICAgaW5jbHVkZTogWydzcmMvKiovKi57dGVzdCxzcGVjfS57dHMsdHN4fSddLFxuICAgIGNvdmVyYWdlOiB7XG4gICAgICBwcm92aWRlcjogJ3Y4JyxcbiAgICAgIHJlcG9ydGVyOiBbJ3RleHQnLCAnanNvbicsICdodG1sJ10sXG4gICAgICByZXBvcnRzRGlyZWN0b3J5OiAnLi4vY292ZXJhZ2UvZnJvbnRlbmQnLFxuICAgIH0sXG4gICAgcmVwb3J0ZXJzOiBbJ2RlZmF1bHQnLCAnanVuaXQnXSxcbiAgICBvdXRwdXRGaWxlOiB7XG4gICAgICBqdW5pdDogJy4uL2NvdmVyYWdlL2p1bml0LnhtbCcsXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFnVSxTQUFTLG9CQUFvQjtBQUM3VixPQUFPLFdBQVc7QUFFbEIsSUFBTyx3QkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLE1BQU07QUFBQSxJQUNKLFNBQVM7QUFBQSxJQUNULGFBQWE7QUFBQSxJQUNiLFlBQVksQ0FBQyxxQkFBcUI7QUFBQSxJQUNsQyxTQUFTLENBQUMsK0JBQStCO0FBQUEsSUFDekMsVUFBVTtBQUFBLE1BQ1IsVUFBVTtBQUFBLE1BQ1YsVUFBVSxDQUFDLFFBQVEsUUFBUSxNQUFNO0FBQUEsTUFDakMsa0JBQWtCO0FBQUEsSUFDcEI7QUFBQSxJQUNBLFdBQVcsQ0FBQyxXQUFXLE9BQU87QUFBQSxJQUM5QixZQUFZO0FBQUEsTUFDVixPQUFPO0FBQUEsSUFDVDtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
