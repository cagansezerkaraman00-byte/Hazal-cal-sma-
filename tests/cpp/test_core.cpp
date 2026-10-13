// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#include <aerion/core/build_info.hpp>
#include <aerion/core/error.hpp>
#include <aerion/core/logger.hpp>
#include <aerion/core/parallel.hpp>
#include <aerion/core/timer.hpp>
#include <aerion/core/version.hpp>

#include <gtest/gtest.h>

#include <string>
#include <utility>
#include <vector>

namespace aerion {
namespace {

TEST(Error, RequireThrowsInvalidArgumentWithLocation) {
    EXPECT_NO_THROW(require(true, "never thrown"));
    try {
        require(false, "nx must be positive");
        FAIL() << "require(false) did not throw";
    } catch (const InvalidArgument& e) {
        const std::string what = e.what();
        EXPECT_NE(what.find("nx must be positive"), std::string::npos);
        EXPECT_NE(what.find("test_core.cpp:"), std::string::npos) << what;
    }
}

TEST(Error, HierarchyDerivesFromRuntimeError) {
    EXPECT_THROW(throw NumericalError("x"), Error);
    EXPECT_THROW(throw IOError("x"), std::runtime_error);
    EXPECT_THROW(throw InvalidArgument("x"), Error);
}

class LoggerTest : public ::testing::Test {
protected:
    void SetUp() override {
        saved_level_ = log_level();
        set_log_sink([this](LogLevel level, std::string_view msg) {
            messages_.emplace_back(level, std::string(msg));
        });
    }
    void TearDown() override {
        set_log_sink({});
        set_log_level(saved_level_);
    }
    LogLevel saved_level_{};
    std::vector<std::pair<LogLevel, std::string>> messages_;
};

TEST_F(LoggerTest, FiltersBelowConfiguredLevel) {
    set_log_level(LogLevel::Warning);
    log_debug("debug");
    log_info("info");
    log_warning("warning");
    log_error("error");
    ASSERT_EQ(messages_.size(), 2U);
    EXPECT_EQ(messages_[0].first, LogLevel::Warning);
    EXPECT_EQ(messages_[1].second, "error");
}

TEST_F(LoggerTest, OffSilencesEverything) {
    set_log_level(LogLevel::Off);
    log_error("error");
    EXPECT_TRUE(messages_.empty());
}

TEST(Logger, LevelNames) {
    EXPECT_EQ(to_string(LogLevel::Debug), "debug");
    EXPECT_EQ(to_string(LogLevel::Warning), "warning");
}

TEST(BuildInfo, ReportsGeneratedVersion) {
    const BuildInfo info = build_info();
    EXPECT_EQ(info.version, std::string(version_string));
    EXPECT_FALSE(info.compiler.empty());
    EXPECT_GE(info.cxx_standard, 202002L);
    EXPECT_FALSE(info.cuda);
    EXPECT_EQ(info.openmp, openmp_enabled());
    EXPECT_GE(info.max_threads, 1);
    EXPECT_NE(build_summary().find("Engineering the Invisible"), std::string::npos);
}

TEST(Parallel, ThreadCountValidation) {
    EXPECT_THROW(set_num_threads(0), InvalidArgument);
    const int before = max_threads();
    set_num_threads(1);
    EXPECT_EQ(max_threads(), 1);
    set_num_threads(before);
}

TEST(WallTimer, IsMonotonic) {
    WallTimer timer;
    const double t1 = timer.elapsed_seconds();
    const double t2 = timer.elapsed_seconds();
    EXPECT_GE(t1, 0.0);
    EXPECT_GE(t2, t1);
}

}  // namespace
}  // namespace aerion
