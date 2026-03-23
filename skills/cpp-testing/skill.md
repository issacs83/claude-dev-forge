---
name: cpp-testing
description: "C++ test patterns for embedded (Google Test, CppUTest)"
---

# C++ Testing Patterns

## Frameworks
- **Google Test**: primary for application-level C++ testing
- **CppUTest**: lightweight, suitable for embedded/bare-metal
- **Unity**: C-only testing for drivers and HAL layers

## Google Test Patterns

### Test Fixture (TEST_F)
```cpp
class SensorDriverTest : public ::testing::Test {
protected:
    void SetUp() override { driver_ = std::make_unique<SensorDriver>(mock_hal_); }
    void TearDown() override { driver_.reset(); }
    MockHAL mock_hal_;
    std::unique_ptr<SensorDriver> driver_;
};

TEST_F(SensorDriverTest, ReadsTemperatureWithinRange) {
    mock_hal_.SetRegisterValue(TEMP_REG, 0x1A);
    EXPECT_NEAR(driver_->ReadTemperature(), 26.0, 0.5);
}
```

### EXPECT vs ASSERT
- `EXPECT_*`: continues on failure (prefer for most checks)
- `ASSERT_*`: stops test on failure (use for preconditions)

### Parameterized Tests
- Use `TEST_P` + `INSTANTIATE_TEST_SUITE_P` for boundary conditions
- Test overflow, underflow, NULL, max values

## HAL Mocking
- Define HAL interface as abstract class or function pointers
- Mock implementation for unit tests
- Real implementation for integration/HIL tests
- QEMU can provide pseudo-HW for integration tests

## Boundary Conditions (Embedded)
- Buffer overflow/underflow
- NULL pointer dereference
- Integer overflow (especially in fixed-point math)
- ISR reentrancy and timing
- DMA alignment and cache coherency

## CMake Integration
```cmake
enable_testing()
add_executable(tests test_main.cpp test_sensor.cpp)
target_link_libraries(tests GTest::gtest_main)
add_test(NAME unit_tests COMMAND tests)
```
